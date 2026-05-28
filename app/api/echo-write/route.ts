import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getServerEnv } from '@/lib/env';
import { recordGenerationEvent } from '@/lib/generation-events';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getCanonicalBody } from '@/lib/source-content/body';


function decodeHtmlEntities(input: string): string {
  return String(input || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function normalizeXmlToText(input: string): string {
  const decoded = decodeHtmlEntities(input || '');
  return decoded
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<paragraph[^>]*>([\s\S]*?)<\/paragraph>/gi, '$1\n\n')
    .replace(/<container_text[^>]*>([\s\S]*?)<\/container_text>/gi, '\n\n$1\n')
    .replace(/<document_title[^>]*>([\s\S]*?)<\/document_title>/gi, '\n\n$1\n')
    .replace(/<short_title[^>]*>([\s\S]*?)<\/short_title>/gi, '\n\n$1\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

type EchoWriteBody = {
  prompt: string;
  writingStyle: 'professional' | 'fun' | 'educational';
  contentType: 'article' | 'video-script';
  length: 'short' | 'medium' | 'long';
  targetWordCount?: number;
  maxSources?: number;
};

const STOP_WORDS = new Set([
  'about',
  'after',
  'also',
  'because',
  'before',
  'between',
  'could',
  'from',
  'have',
  'into',
  'more',
  'most',
  'only',
  'other',
  'over',
  'should',
  'than',
  'that',
  'their',
  'there',
  'these',
  'they',
  'this',
  'through',
  'when',
  'where',
  'which',
  'with',
  'would',
  'your',
]);

function styleInstruction(style: EchoWriteBody['writingStyle']) {
  if (style === 'fun') return 'Use engaging, lively pacing, conversational vocabulary, and a friendly CTA.';
  if (style === 'educational') return 'Use teacher-like clarity, structured explanations, and actionable educational CTA.';
  return 'Use polished professional tone, concise business language, and confident CTA.';
}

function lengthInstruction(
  length: EchoWriteBody['length'],
  targetWordCount?: number,
  contentType?: EchoWriteBody['contentType'],
) {
  if (targetWordCount && targetWordCount > 0) return `Target about ${targetWordCount} words.`;

  // Video scripts should be short, speakable, and doable in one take.
  if (contentType === 'video-script') {
    if (length === 'short') return 'Target ~150-250 words (about 45-75 seconds spoken).';
    if (length === 'long') return 'Target ~500-750 words (about 2.5-4 minutes spoken).';
    return 'Target ~300-450 words (about 1.5-2.5 minutes spoken).';
  }

  if (length === 'short') return 'Target 350-500 words.';
  if (length === 'long') return 'Target 1100-1500 words.';
  return 'Target 700-950 words.';
}

function videoScriptStructureInstruction(
  length: EchoWriteBody['length'],
  targetWordCount?: number,
) {
  const timing =
    targetWordCount && targetWordCount > 0
      ? `Aim for about ${targetWordCount} spoken words.`
      : length === 'short'
        ? 'Aim for about 45-75 seconds spoken.'
        : length === 'long'
          ? 'Aim for about 2.5-4 minutes spoken.'
          : 'Aim for about 90-150 seconds spoken.';

  return [
    'Write a practical advisor-to-camera video script that is easy to read aloud.',
    timing,
    '',
    'Use this exact readable structure:',
    'TITLE: [short working title]',
    'RUNTIME: [estimated spoken runtime]',
    '',
    'HOOK',
    '[1-2 short spoken sentences that create immediate interest.]',
    '',
    'SCRIPT',
    '[Write the spoken script as short paragraphs. Each paragraph should be 1-3 sentences. Put a blank line between paragraphs.]',
    '',
    'OPTIONAL ON-SCREEN TEXT',
    '- [3-5 short text overlays, max 7 words each]',
    '',
    'CTA',
    '[One clear closing line.]',
    '',
    'Formatting rules:',
    '- Use the labels exactly as shown: TITLE, RUNTIME, HOOK, SCRIPT, OPTIONAL ON-SCREEN TEXT, CTA.',
    '- Do not use markdown heading symbols.',
    '- Do not write a two-column table.',
    '- Do not include camera directions, b-roll instructions, shot lists, production notes, or bracketed stage directions.',
    '- Do not over-cite source names inside the spoken script.',
    '- Keep sentences conversational, concrete, and speakable.',
  ].join('\n');
}

function tokenize(input: string) {
  return Array.from(new Set(
    input
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 3 && !STOP_WORDS.has(token))
  ));
}

function scoreRow(row: any, query: string, tokens: string[], cleanBody: string) {
  const title = String(row.title || '').toLowerCase();
  const body = cleanBody.toLowerCase();
  const q = query.toLowerCase().trim();
  let score = 0;

  if (q && title.includes(q)) score += 28;
  if (q && body.includes(q)) score += 14;

  const matchedTerms: string[] = [];
  for (const t of tokens) {
    if (title.includes(t)) {
      score += 8;
      matchedTerms.push(t);
    } else if (body.includes(t)) {
      score += 3;
      matchedTerms.push(t);
    }
  }

  for (let i = 0; i < tokens.length - 1; i += 1) {
    const phrase = `${tokens[i]} ${tokens[i + 1]}`;
    if (title.includes(phrase)) score += 10;
    else if (body.includes(phrase)) score += 5;
  }

  const coverage = tokens.length ? matchedTerms.length / tokens.length : 0;
  score += Math.round(coverage * 10);

  return { score, matched: matchedTerms.length, matchedTerms: Array.from(new Set(matchedTerms)) };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EchoWriteBody;
    if (!body?.prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: rows, error } = await supabase
      .from('source_content')
      .select('id,title,body_text,body,publisher,content_designation,tags,published_at,bas_content_id')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(1000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const tokens = tokenize(body.prompt);

    const ranked = (rows || [])
      .map((row) => {
        const cleanBody = normalizeXmlToText(getCanonicalBody(row));
        return { row, cleanBody, ...scoreRow(row, body.prompt, tokens, cleanBody) };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(0, Math.min(12, Number(body.maxSources ?? 6))));

    const context = ranked
      .map((x, idx) => {
        return `Source ${idx + 1} | ${decodeHtmlEntities(String(x.row.title || ''))}\nDesignation: ${x.row.content_designation || 'n/a'}\nBasContentId: ${(x.row as any).bas_content_id || 'n/a'}\nTags: ${(x.row.tags || []).join(', ')}\nMatched terms: ${x.matchedTerms.join(', ') || 'n/a'}\n\n${x.cleanBody.slice(0, 1800)}`;
      })
      .join('\n\n---\n\n');

    const env = getServerEnv();
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const modelName = body.contentType === 'video-script'
      ? env.ECHOWRITE_VIDEO_MODEL
      : env.ECHOWRITE_MODEL;

    const contentTypeInstruction = body.contentType === 'video-script'
      ? videoScriptStructureInstruction(body.length, body.targetWordCount)
      : 'Write as an editorial article with: strong headline, subheadings, skimmable structure, intro and conclusion, and SEO-friendly formatting plus metadata suggestions.';

    const prompt = [
      `User intent: ${body.prompt}`,
      contentTypeInstruction,
      styleInstruction(body.writingStyle),
      lengthInstruction(body.length, body.targetWordCount, body.contentType),
      'Formatting requirements (strict):',
      '- Write in clearly separated paragraphs.',
      '- Use a blank line between paragraphs and between sections (double newlines).',
      '- Do not output one giant block of text.',
      '- Use short paragraphs (2–4 sentences).',
      body.contentType === 'video-script'
        ? '- For video scripts: use the required script labels, but keep the SCRIPT section as natural spoken paragraphs.'
        : '- Write like a readable editorial article a human would actually read: natural headline, subheadings only where helpful (don’t over-fragment), and longer coherent paragraphs when needed.' ,
      'Ground all claims in provided source context. Synthesize; do not copy verbatim. Avoid hallucinations.',
      'Do not invent statistics, regulatory claims, or source details that are not present in SOURCE CONTEXT.',
      'Return publication-ready output only.',
      '',
      'SOURCE CONTEXT:',
      context || 'No source context found. Be explicit about uncertainty and stay generic.',
    ].join('\n');

    const result = await generateText({
      model: openai(modelName),
      prompt,
      temperature: body.contentType === 'video-script' ? 0.35 : 0.5,
      maxOutputTokens: 2200,
    });

    await recordGenerationEvent({
      tool: 'echowrite',
      contentType: body.contentType,
      category: 'content',
      assetCount: 1,
      model: modelName,
      meta: {
        writingStyle: body.writingStyle,
        length: body.length,
        maxSources: Number(body.maxSources ?? 6),
        globalModel: env.OPENAI_MODEL,
      },
    });

    return NextResponse.json({
      content: result.text,
      debug: { prompt, model: modelName },
      sources: ranked.map((x) => ({
        id: x.row.id,
        title: x.row.title,
        publisher: x.row.publisher,
        basContentId: (x.row as any).bas_content_id || null,
        designation: x.row.content_designation,
        score: x.score,
        matchedTerms: x.matchedTerms,
        bodySnippet: x.cleanBody.slice(0, 2200),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'EchoWrite failed' }, { status: 500 });
  }
}
