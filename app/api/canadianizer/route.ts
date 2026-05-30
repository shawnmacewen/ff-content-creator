import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { recordGenerationEvent } from '@/lib/generation-events';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getCanonicalBody } from '@/lib/source-content/body';

const EquivalentSchema = z.object({
  americanConcept: z.string().min(1),
  canadianEquivalent: z.string().min(1),
  confidence: z.enum(['high', 'medium', 'low']),
  notes: z.string().min(1),
});

const CanadianizerSchema = z.object({
  canadianTitle: z.string().min(1),
  canadianArticleMarkdown: z.string().min(1),
  executiveSummary: z.string().min(1),
  equivalentMap: z.array(EquivalentSchema).min(1).max(12),
  gapsAndNonMatches: z.array(z.string()).max(10),
  editorialNotes: z.array(z.string()).min(1).max(10),
  complianceNotes: z.array(z.string()).min(1).max(8),
});

const EvaluationSchema = z.object({
  matchScore: z.number().min(0).max(100),
  matchScoreLabel: z.enum(['Strong match', 'Good match', 'Partial match', 'Low match']),
  warningLevel: z.enum(['none', 'review', 'severe']),
  warningMessage: z.string().min(1),
  scoreRationale: z.string().min(1),
  originalConcepts: z.array(z.string().min(1)).min(1).max(12),
  convertedConcepts: z.array(z.string().min(1)).min(1).max(12),
  unsupportedClaims: z.array(z.string()).max(12),
  missingOrWeakEquivalents: z.array(z.string()).max(12),
  evaluatorNotes: z.array(z.string().min(1)).min(1).max(10),
});

const canadianizerModels = new Set([
  'gpt-4o-mini',
  'gpt-4.1',
  'gpt-5.2',
]);

function decodeHtmlEntities(input: string) {
  return String(input || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function safeArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function mapSource(row: any) {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const body = getCanonicalBody(row);
  const categories = [
    ...safeArray(row?.categories),
    ...safeArray(row?.sub_categories),
    ...safeArray(metadata?.categories),
    ...safeArray(metadata?.subCategories),
    ...safeArray(row?.tags),
  ].map((item) => decodeHtmlEntities(String(item))).filter(Boolean);

  return {
    id: String(row.id),
    title: decodeHtmlEntities(String(row.title || 'Untitled source')),
    author: String(row.author || 'Unknown'),
    publisher: String(row.publisher || row.source_system || 'Forefield'),
    publishedAt: row.published_at || null,
    contentDesignation: String(row.content_designation || row.type || metadata.contentDesignation || 'Source Content'),
    tags: Array.from(new Set(categories)).slice(0, 10),
    body: body.slice(0, 14000),
  };
}

function normalizeScoreLabel(score: number): z.infer<typeof EvaluationSchema>['matchScoreLabel'] {
  if (score >= 85) return 'Strong match';
  if (score >= 70) return 'Good match';
  if (score >= 45) return 'Partial match';
  return 'Low match';
}

function normalizeWarningLevel(score: number): z.infer<typeof EvaluationSchema>['warningLevel'] {
  if (score < 30) return 'severe';
  if (score < 60) return 'review';
  return 'none';
}

function warningMessageFor(score: number, fallback: string) {
  if (score < 30) return 'Severe warning: this article appears too U.S.-specific to duplicate as Canadian content without substantial new Canadian source research.';
  if (score < 60) return 'Review warning: this article has weak Canadian equivalency and needs careful editorial/SME review before use.';
  return fallback || 'No major conversion warning.';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sourceContentId = String(body?.sourceContentId || '').trim();
    const audience = String(body?.audience || 'Canadian financial advisors and their clients').trim();
    const province = String(body?.province || 'Canada-wide').trim();
    const tone = String(body?.tone || 'Editorial, clear, engaging').trim();
    const length = String(body?.length || 'similar').trim();
    const includeDisclosure = Boolean(body?.includeDisclosure ?? true);
    const mode = body?.mode === 'extreme' ? 'extreme' : 'normal';
    const requestedModel = String(body?.model || '').trim();

    if (!sourceContentId) {
      return Response.json({ error: 'Select one source content item to Canadianize.' }, { status: 400 });
    }

    const env = getServerEnv();
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('source_content')
      .select('id,title,author,publisher,source_system,published_at,tags,categories,sub_categories,metadata,content_designation,type,body_text,body')
      .eq('id', sourceContentId)
      .single();

    if (error || !data) {
      return Response.json({ error: 'Selected source content was not found.' }, { status: 404 });
    }

    const source = mapSource(data);
    if (!source.body.trim()) {
      return Response.json({ error: 'Selected source content has no readable body text.' }, { status: 400 });
    }

    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const isExtreme = mode === 'extreme';
    const selectedModel = canadianizerModels.has(requestedModel) ? requestedModel : env.OPENAI_MODEL;
    const generationPrompt = [
      'You are an expert Canadian financial editorial strategist adapting U.S. financial education content for a Canadian audience.',
      'Your job is not to mechanically translate words. Your job is to preserve the useful client education intent, then rebuild the article around Canadian equivalents when a reasonable equivalent exists.',
      '',
      'Critical rules:',
      '- Use Canadian terminology, institutions, tax concepts, plan types, savings vehicles, regulatory framing, and market context where appropriate.',
      '- Convert U.S.-specific concepts into Canadian equivalents only when there is a defensible Canadian match.',
      '- If a concept is tied to a U.S.-only agency, rule, program, plan, regulator, court, filing, or statute, do not invent a Canadian equivalent. Identify it as a gap or rewrite around a broader theme.',
      '- Examples: 401(k) and IRA may map to RRSP/TFSA depending on context; 529 plans may map imperfectly to RESPs; U.S. Department of Labor, ERISA, SEC, FINRA, IRS, Medicare, Social Security, U.S. estate/gift/tax rules, and U.S. state rules often do not have a direct Canadian equivalent.',
      '- If no clean Canadian equivalent exists, say so in gapsAndNonMatches and write around the concept honestly.',
      '- Do not invent specific rates, contribution limits, legal deadlines, regulator claims, government departments, compliance requirements, or tax rules.',
      '- Avoid saying content is legal, tax, or investment advice.',
      '- Keep the content useful and engaging for Canadian advisors and clients, not academic.',
      '- Preserve the original article intent, structure, and major themes where possible, but rewrite deeply enough that the Canadian article stands on its own.',
      '- If province-specific treatment matters and the selected province is Canada-wide, use Canada-wide framing and note when provincial rules may vary.',
      '',
      'Output requirements:',
      '- canadianArticleMarkdown should be a polished article in Markdown with a clear headline, short intro, section headings, and practical closing.',
      '- equivalentMap should list the important U.S. concepts and their Canadian substitutions or caveats.',
      '- For U.S.-specific concepts with no direct equivalent, canadianEquivalent should say "No direct Canadian equivalent" and notes should explain the gap.',
      '- complianceNotes should flag review concerns and places where a Canadian SME should verify details.',
      includeDisclosure ? '- Include a brief non-advice/disclosure note near the end of the article.' : '- Do not add a formal disclosure note in the article.',
      '',
      isExtreme
        ? [
            'EXTREME MAPLE MODE:',
            '- This is an internal comedy mode. Keep the financial concept adaptation directionally useful, but make the voice overtly, playfully Canadian.',
            '- Use light Canadian humour, maple-forward metaphors, rink/weather/cottage-season references, and friendly "eh" energy where it fits.',
            '- Do not use offensive stereotypes, slurs, or jokes about protected groups.',
            '- Do not make the financial facts more confident than the source supports. The comedy should be in the voice, not in fabricated tax or legal claims.',
            '- editorialNotes must explicitly say this is not publish-ready without toning down the comedic style.',
          ].join('\n')
        : [
            'NORMAL MODE:',
            '- Keep the voice professional, polished, and credible for an enterprise editorial workflow.',
            '- Avoid forced Canadian slang. Use Canadian context and terminology without making the article feel like parody.',
          ].join('\n'),
      '',
      'Configuration:',
      `Audience: ${audience}`,
      `Province/region: ${province}`,
      `Tone: ${tone}`,
      `Length: ${length}`,
      `Mode: ${mode}`,
      `Model: ${selectedModel}`,
      '',
      'SOURCE METADATA:',
      `id: ${source.id}`,
      `title: ${source.title}`,
      `publisher: ${source.publisher}`,
      `publishedAt: ${source.publishedAt || 'unknown'}`,
      `contentDesignation: ${source.contentDesignation}`,
      `tags: ${source.tags.join(', ') || 'none'}`,
      '',
      'SOURCE ARTICLE:',
      source.body,
    ].join('\n');

    const result = await generateObject({
      model: openai(selectedModel),
      schema: CanadianizerSchema,
      temperature: isExtreme ? 0.72 : 0.22,
      prompt: generationPrompt,
    });

    const evaluationPrompt = [
      'You are a strict Canadian financial-services editorial evaluator.',
      'Score whether a U.S. source article was responsibly converted into a Canadian article.',
      '',
      'Important: the score is not writing quality. The score measures conceptual convertibility and factual responsibility.',
      'Penalize heavily for invented Canadian equivalents, invented regulators, invented laws, invented departments, fabricated tax details, or unsupported Canadian claims.',
      'If the original is mostly about a U.S.-specific agency, rule, statute, program, regulator, or government process with no real Canadian equivalent, the score should usually be below 30 even if the draft is well written.',
      '',
      'Score guide:',
      '- 90-100: Most source concepts have strong real Canadian equivalents and the Canadian article preserves the original educational intent without unsupported claims.',
      '- 70-89: Main theme converts well, with a few caveats or weaker equivalents.',
      '- 60-69: Usable only with careful review; several concepts are weak or generic.',
      '- 30-59: Weak conversion; major concepts lack real Canadian equivalents or need new Canadian source research.',
      '- 0-29: Severe mismatch; article should not be duplicated as Canadian content because it is too U.S.-specific or the draft invented equivalents.',
      '',
      'Warning thresholds:',
      '- warningLevel="none" only if score is 60 or higher.',
      '- warningLevel="review" if score is 30-59.',
      '- warningLevel="severe" if score is 0-29.',
      '',
      'Return unsupportedClaims for Canadian claims in the output that are not supported by the original or by safe broad Canadian context.',
      'Return missingOrWeakEquivalents for U.S. concepts that did not convert cleanly.',
      '',
      'ORIGINAL SOURCE:',
      source.body.slice(0, 18000),
      '',
      'CANADIANIZED OUTPUT:',
      result.object.canadianArticleMarkdown.slice(0, 18000),
      '',
      'GENERATION EQUIVALENT MAP:',
      JSON.stringify(result.object.equivalentMap, null, 2),
      '',
      'GENERATION GAPS AND NON-MATCHES:',
      JSON.stringify(result.object.gapsAndNonMatches, null, 2),
    ].join('\n');

    const evaluation = await generateObject({
      model: openai(selectedModel),
      schema: EvaluationSchema,
      temperature: 0,
      prompt: evaluationPrompt,
    });

    const matchScore = Math.round(evaluation.object.matchScore);
    const warningLevel = normalizeWarningLevel(matchScore);
    const canadianized = {
      ...result.object,
      matchScore,
      matchScoreLabel: normalizeScoreLabel(matchScore),
      warningLevel,
      warningMessage: warningMessageFor(matchScore, evaluation.object.warningMessage),
      scoreRationale: evaluation.object.scoreRationale,
      evaluator: {
        originalConcepts: evaluation.object.originalConcepts,
        convertedConcepts: evaluation.object.convertedConcepts,
        unsupportedClaims: evaluation.object.unsupportedClaims,
        missingOrWeakEquivalents: evaluation.object.missingOrWeakEquivalents,
        evaluatorNotes: evaluation.object.evaluatorNotes,
      },
      promptLog: [
        {
          step: 'generation',
          model: selectedModel,
          temperature: isExtreme ? 0.72 : 0.22,
          prompt: generationPrompt,
        },
        {
          step: 'evaluation',
          model: selectedModel,
          temperature: 0,
          prompt: evaluationPrompt,
        },
      ],
      source: {
        id: source.id,
        title: source.title,
        publisher: source.publisher,
        publishedAt: source.publishedAt,
        contentDesignation: source.contentDesignation,
        tags: source.tags,
      },
      config: {
        audience,
        province,
        tone,
        length,
        includeDisclosure,
        mode,
        model: selectedModel,
      },
    };

    await recordGenerationEvent({
      tool: 'canadianizer',
      contentType: 'article',
      category: 'content',
      assetCount: 1,
      model: selectedModel,
      meta: {
        sourceContentId: source.id,
        matchScore,
        matchScoreLabel: canadianized.matchScoreLabel,
        warningLevel,
        mode,
      },
    });

    return Response.json({ canadianized });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to Canadianize source content.' }, { status: 500 });
  }
}
