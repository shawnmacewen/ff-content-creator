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

function extraPropertyFromArray(meta: any, key: string): string | undefined {
  const arr = meta?.raw?.extra_properties;
  if (!Array.isArray(arr)) return undefined;

  const hit = arr.find((item: any) => String(item?.key || '') === key);
  const value = hit?.stringValue ?? hit?.value ?? hit?.string_value;
  return typeof value === 'string' ? value : undefined;
}

function getSourceImageUrl(row: any) {
  const meta = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const extraMap = meta?.extraProperties || meta?.raw?.extraProperties || null;

  const image =
    extraMap?.['SocialMediaPlatformImages.LinkedIn'] ||
    meta?.['SocialMediaPlatformImages.LinkedIn'] ||
    extraPropertyFromArray(meta, 'SocialMediaPlatformImages.LinkedIn') ||
    meta?.SocialMediaPlatformImages?.LinkedIn ||
    meta?.SocialMediaPlatformImages?.linkedIn ||
    meta?.SocialMediaPlatformImages?.linkedin ||
    meta?.socialMediaPlatformImages?.LinkedIn ||
    meta?.socialMediaPlatformImages?.linkedIn ||
    meta?.socialMediaPlatformImages?.linkedin ||
    extraMap?.['SocialMediaPlatformImages.Thumbnail'] ||
    meta?.['SocialMediaPlatformImages.Thumbnail'] ||
    extraPropertyFromArray(meta, 'SocialMediaPlatformImages.Thumbnail') ||
    meta?.SocialMediaPlatformImages?.Thumbnail ||
    meta?.SocialMediaPlatformImages?.thumbnail ||
    meta?.socialMediaPlatformImages?.Thumbnail ||
    meta?.socialMediaPlatformImages?.thumbnail ||
    meta?.imageUrl;

  return typeof image === 'string' && image.trim() ? image.trim() : null;
}

type EchoWriteBody = {
  prompt: string;
  writingStyle: 'professional' | 'fun' | 'educational';
  contentType: 'article' | 'video-script';
  length: 'short' | 'medium' | 'long';
  targetWordCount?: number;
  maxSources?: number;
  model?: string;
};

const ECHOWRITE_MODELS = new Set([
  'gpt-4o-mini',
  'gpt-4.1',
  'gpt-5.2',
  'gpt-5.5',
]);

const STOP_WORDS = new Set([
  '000',
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
  'word',
  'words',
  'your',
]);

const ECHOWRITE_TASK_WORDS = new Set([
  'article',
  'blog',
  'brief',
  'caption',
  'content',
  'create',
  'draft',
  'email',
  'explain',
  'generate',
  'headline',
  'newsletter',
  'piece',
  'post',
  'prompt',
  'script',
  'story',
  'video',
  'write',
  'cover',
  'covers',
]);

const BROAD_CONTEXT_WORDS = new Set([
  'advice',
  'advisor',
  'advisors',
  'client',
  'clients',
  'effect',
  'effects',
  'financial',
  'finance',
  'impact',
  'impacts',
  'benefit',
  'benefits',
  'long',
  'market',
  'markets',
  'money',
  'planning',
  'price',
  'prices',
  'short',
  'strategy',
  'term',
  'terms',
]);

function safeArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function searchableMeta(row: any) {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const extra = metadata.extraPropertiesSelected || metadata.extraProperties || {};
  return [
    row.bas_content_filename,
    row.bas_content_id,
    row.external_id,
    extra.BasContentFilename,
    extra.BasContentId,
    metadata.excerpt,
    row.recommended_audience,
    ...safeArray(row.key_takeaways),
    ...safeArray(row.tags),
    ...safeArray(row.categories),
    ...safeArray(row.sub_categories),
  ].filter(Boolean).join(' ');
}

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
      .filter((token) => token.length > 2 && !/^\d+$/.test(token) && !STOP_WORDS.has(token))
  ));
}

function normalizeSearchText(input: string) {
  return ` ${String(input || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

function tokenSet(input: string) {
  return new Set(tokenize(input));
}

function tokenVariants(token: string) {
  const variants = new Set([token]);
  if (token.length > 3 && token.endsWith('s')) variants.add(token.slice(0, -1));
  if (token.length > 3 && !token.endsWith('s')) variants.add(`${token}s`);
  return Array.from(variants);
}

function buildSearchTerms(prompt: string) {
  const allTokens = tokenize(prompt);
  const topicalTokens = allTokens.filter((token) => !ECHOWRITE_TASK_WORDS.has(token));
  const anchorTokens = topicalTokens.filter((token) => !BROAD_CONTEXT_WORDS.has(token));

  return {
    allTokens,
    topicalTokens,
    anchorTokens,
  };
}

function minimumRequiredTopicMatches(terms: ReturnType<typeof buildSearchTerms>) {
  if (terms.anchorTokens.length >= 2) return 2;
  if (terms.anchorTokens.length === 1) return 1;
  if (terms.topicalTokens.length >= 4) return 3;
  if (terms.topicalTokens.length >= 2) return 2;
  return terms.topicalTokens.length;
}

function scoreRow(
  row: any,
  query: string,
  terms: ReturnType<typeof buildSearchTerms>,
  cleanBody: string,
) {
  const titleText = String(row.title || '');
  const metaText = searchableMeta(row);
  const title = normalizeSearchText(titleText);
  const meta = normalizeSearchText(metaText);
  const body = normalizeSearchText(cleanBody);
  const titleTokens = tokenSet(titleText);
  const metaTokens = tokenSet(metaText);
  const bodyTokens = tokenSet(cleanBody);
  const q = query.toLowerCase().trim();
  let score = 0;

  if (q && title.includes(` ${q} `)) score += 28;
  if (q && meta.includes(` ${q} `)) score += 18;
  if (q && body.includes(` ${q} `)) score += 14;

  const matchedTerms: string[] = [];
  const matchedTopicalTerms: string[] = [];
  const matchedAnchorTerms: string[] = [];

  for (const t of terms.allTokens) {
    const variants = tokenVariants(t);
    const matchedTitle = variants.some((variant) => titleTokens.has(variant));
    const matchedMeta = variants.some((variant) => metaTokens.has(variant));
    const matchedBody = variants.some((variant) => bodyTokens.has(variant));
    if (matchedTitle) {
      score += terms.anchorTokens.includes(t) ? 14 : 8;
      matchedTerms.push(t);
    } else if (matchedMeta) {
      score += terms.anchorTokens.includes(t) ? 9 : 5;
      matchedTerms.push(t);
    } else if (matchedBody) {
      score += terms.anchorTokens.includes(t) ? 6 : 3;
      matchedTerms.push(t);
    }

    if (matchedTitle || matchedMeta || matchedBody) {
      if (terms.topicalTokens.includes(t)) matchedTopicalTerms.push(t);
      if (terms.anchorTokens.includes(t)) matchedAnchorTerms.push(t);
    }
  }

  for (let i = 0; i < terms.topicalTokens.length - 1; i += 1) {
    const phrase = ` ${terms.topicalTokens[i]} ${terms.topicalTokens[i + 1]} `;
    if (title.includes(phrase)) score += 10;
    else if (meta.includes(phrase)) score += 7;
    else if (body.includes(phrase)) score += 5;
  }

  const uniqueMatchedTerms = Array.from(new Set(matchedTerms));
  const uniqueTopicalTerms = Array.from(new Set(matchedTopicalTerms));
  const uniqueAnchorTerms = Array.from(new Set(matchedAnchorTerms));
  const coverage = terms.allTokens.length ? uniqueMatchedTerms.length / terms.allTokens.length : 0;
  const topicalCoverage = terms.topicalTokens.length ? uniqueTopicalTerms.length / terms.topicalTokens.length : 0;
  score += Math.round(coverage * 8);
  score += Math.round(topicalCoverage * 14);

  return {
    score,
    matched: uniqueMatchedTerms.length,
    matchedTerms: uniqueMatchedTerms,
    matchedTopicalTerms: uniqueTopicalTerms,
    matchedAnchorTerms: uniqueAnchorTerms,
    topicalCoverage,
  };
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
      .select('id,title,body_text,body,publisher,content_designation,tags,published_at,bas_content_id,bas_content_filename,external_id,metadata,key_takeaways,recommended_audience,categories,sub_categories')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(5000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const terms = buildSearchTerms(body.prompt);
    const minTopicMatches = minimumRequiredTopicMatches(terms);

    const ranked = (rows || [])
      .map((row) => {
        const cleanBody = normalizeXmlToText(getCanonicalBody(row));
        return { row, cleanBody, ...scoreRow(row, body.prompt, terms, cleanBody) };
      })
      .filter((x) => {
        if (x.score <= 0) return false;
        if (!minTopicMatches) return true;

        const topicMatchCount = terms.anchorTokens.length
          ? x.matchedAnchorTerms.length
          : x.matchedTopicalTerms.length;

        return topicMatchCount >= minTopicMatches;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(0, Math.min(12, Number(body.maxSources ?? 6))));

    if (!ranked.length) {
      return NextResponse.json({
        error: 'No relevant source content was found for that EchoWrite prompt. Try a more specific title, acronym, filename, or exact phrase in Source Content first.',
        retrieval: {
          scanned: rows?.length || 0,
          topicalTerms: terms.topicalTokens,
          anchorTerms: terms.anchorTokens,
        },
      }, { status: 422 });
    }

    const context = ranked
      .map((x, idx) => {
        return `Source ${idx + 1} | ${decodeHtmlEntities(String(x.row.title || ''))}\nDesignation: ${x.row.content_designation || 'n/a'}\nBasContentId: ${(x.row as any).bas_content_id || 'n/a'}\nTags: ${(x.row.tags || []).join(', ')}\nMatched subject terms: ${x.matchedTopicalTerms.join(', ') || 'n/a'}\nMatched anchor terms: ${x.matchedAnchorTerms.join(', ') || 'n/a'}\n\n${x.cleanBody.slice(0, 1800)}`;
      })
      .join('\n\n---\n\n');

    const env = getServerEnv();
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const fallbackModel = body.contentType === 'video-script'
      ? env.ECHOWRITE_VIDEO_MODEL
      : env.ECHOWRITE_MODEL;
    const requestedModel = String(body.model || '').trim();
    const modelName = ECHOWRITE_MODELS.has(requestedModel) ? requestedModel : fallbackModel;

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
        publishedAt: x.row.published_at || null,
        imageUrl: getSourceImageUrl(x.row),
        score: x.score,
        matchedTerms: x.matchedTerms,
        matchedTopicalTerms: x.matchedTopicalTerms,
        matchedAnchorTerms: x.matchedAnchorTerms,
        bodySnippet: x.cleanBody.slice(0, 2200),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'EchoWrite failed' }, { status: 500 });
  }
}
