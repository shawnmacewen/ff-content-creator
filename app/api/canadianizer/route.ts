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
  matchScore: z.number().min(0).max(100),
  matchScoreLabel: z.enum(['Strong match', 'Good match', 'Partial match', 'Low match']),
  scoreRationale: z.string().min(1),
  equivalentMap: z.array(EquivalentSchema).min(1).max(12),
  gapsAndNonMatches: z.array(z.string()).max(10),
  editorialNotes: z.array(z.string()).min(1).max(10),
  complianceNotes: z.array(z.string()).min(1).max(8),
});

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

function normalizeScoreLabel(score: number): z.infer<typeof CanadianizerSchema>['matchScoreLabel'] {
  if (score >= 85) return 'Strong match';
  if (score >= 70) return 'Good match';
  if (score >= 45) return 'Partial match';
  return 'Low match';
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

    const result = await generateObject({
      model: openai(env.OPENAI_MODEL),
      schema: CanadianizerSchema,
      temperature: isExtreme ? 0.72 : 0.22,
      prompt: [
        'You are an expert Canadian financial editorial strategist adapting U.S. financial education content for a Canadian audience.',
        'Your job is not to mechanically translate words. Your job is to preserve the useful client education intent, then rebuild the article around Canadian equivalents when a reasonable equivalent exists.',
        '',
        'Critical rules:',
        '- Use Canadian terminology, institutions, tax concepts, plan types, savings vehicles, regulatory framing, and market context where appropriate.',
        '- Convert U.S.-specific concepts into Canadian equivalents when there is a defensible match. Examples: 401(k) and IRA may map to RRSP/TFSA depending on context; 529 plans may map imperfectly to RESPs; U.S. estate/gift/tax rules may need Canadian caveats rather than direct replacement.',
        '- If no clean Canadian equivalent exists, say so in gapsAndNonMatches and write around the concept honestly.',
        '- Do not invent specific rates, contribution limits, legal deadlines, regulator claims, or tax rules unless they are broad, stable, and necessary. Prefer general language and editorial caveats.',
        '- Avoid saying content is legal, tax, or investment advice.',
        '- Keep the content useful and engaging for Canadian advisors and clients, not academic.',
        '- Preserve the original article intent, structure, and major themes where possible, but rewrite deeply enough that the Canadian article stands on its own.',
        '- If province-specific treatment matters and the selected province is Canada-wide, use Canada-wide framing and note when provincial rules may vary.',
        '',
        'Match score guidance:',
        '- 90-100: Most major concepts have strong Canadian equivalents and the article remains coherent.',
        '- 70-89: Main theme converts well, with a few caveats or weaker equivalents.',
        '- 45-69: Some useful conversion, but major source concepts do not map cleanly.',
        '- 0-44: The article is highly U.S.-specific or would require new Canadian source research.',
        '',
        'Output requirements:',
        '- canadianArticleMarkdown should be a polished article in Markdown with a clear headline, short intro, section headings, and practical closing.',
        '- equivalentMap should list the important U.S. concepts and their Canadian substitutions or caveats.',
        '- scoreRationale should explain why the match score is high or low in plain language.',
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
      ].join('\n'),
    });

    const matchScore = Math.round(result.object.matchScore);
    const canadianized = {
      ...result.object,
      matchScore,
      matchScoreLabel: normalizeScoreLabel(matchScore),
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
      },
    };

    await recordGenerationEvent({
      tool: 'canadianizer',
      contentType: 'article',
      category: 'content',
      assetCount: 1,
      model: env.OPENAI_MODEL,
      meta: {
        sourceContentId: source.id,
        matchScore,
        matchScoreLabel: canadianized.matchScoreLabel,
        mode,
      },
    });

    return Response.json({ canadianized });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to Canadianize source content.' }, { status: 500 });
  }
}
