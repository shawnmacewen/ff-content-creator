import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { MOCK_SOURCE_CONTENT } from '@/lib/api/source-content-mock';
import { normalizeCachedFilters } from '@/lib/source-content/stats';
import { getServerEnv } from '@/lib/env';
import { normalizeGenerationUsage, recordGenerationEvent } from '@/lib/generation-events';

const CONTENT_TYPE_OPTIONS = ['Article', 'Newsletter', 'Market Commentary', 'Topic Discussion', 'Client Education', 'Custom Content'];

const AiScanSchema = z.object({
  title: z.string().min(1).max(140),
  summary: z.string().min(1).max(300),
  contentDesignation: z.string().min(1),
  type: z.string().min(1),
  tags: z.array(z.string()).min(0).max(3),
  author: z.string().optional().default(''),
  publishedAt: z.string().optional().default(''),
  filename: z.string().optional().default(''),
  recommendedAudience: z.string().optional().default(''),
  confidence: z.number().min(0).max(1).default(0.65),
  warnings: z.array(z.string()).max(6).default([]),
});

function normalizeText(value: unknown) {
  return String(value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function titleFromText(text: string) {
  const firstLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length >= 8 && line.length <= 120);

  if (firstLine) return firstLine.replace(/^#+\s*/, '').trim();

  return text.split(/[.!?]/)[0]?.trim().slice(0, 100) || 'Custom content upload';
}

function summaryFromText(text: string) {
  const paragraphs = text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const source = paragraphs.find((item) => item.length > 80) || paragraphs[0] || text;
  return source.replace(/\s+/g, ' ').slice(0, 360).trim();
}

function authorFromText(text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 16);

  for (const line of lines) {
    const directMatch = line.match(/^(?:by|author|written by|prepared by)[:\s]+(.{2,80})$/i);
    if (directMatch?.[1]) {
      return directMatch[1].replace(/\s*\|.*$/, '').trim();
    }

    const labeledMatch = line.match(/^(.{2,80})\s+-\s+(?:author|advisor|editorial team)$/i);
    if (labeledMatch?.[1]) {
      return labeledMatch[1].trim();
    }
  }

  return '';
}

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreChoice(choice: string, haystack: string) {
  const normalized = normalizeForMatch(choice);
  if (!normalized) return 0;
  if (normalized.length <= 3) {
    return haystack.split(' ').includes(normalized) ? normalized.length + 10 : 0;
  }
  if (haystack.includes(normalized)) return normalized.length + 10;

  return normalized
    .split(' ')
    .filter((part) => part.length > 3 && haystack.includes(part))
    .length;
}

function normalizeChoice(value: string | undefined, choices: string[], fallback: string) {
  if (!value) return fallback;
  const normalized = normalizeForMatch(value);
  const exact = choices.find((choice) => normalizeForMatch(choice) === normalized);
  if (exact) return exact;
  const partial = choices
    .map((choice) => ({ choice, score: scoreChoice(choice, normalized) || scoreChoice(value, normalizeForMatch(choice)) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.choice.localeCompare(b.choice))[0]?.choice;

  return partial || fallback;
}

function cleanFilename(value: string | undefined, title: string) {
  const source = value || `${title}.txt`;
  const cleaned = source
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  if (!cleaned) return 'custom-content.txt';
  return /\.[a-z0-9]{2,5}$/.test(cleaned) ? cleaned : `${cleaned}.txt`;
}

function quickDraft(rawText: string, sourceUrl: string, filters: Awaited<ReturnType<typeof readFilters>>) {
  const haystack = normalizeForMatch(rawText);
  const tagSuggestions = filters.availableTags
    .map((tag) => ({ tag, score: scoreChoice(tag, haystack) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag))
    .slice(0, 3)
    .map((item) => item.tag);

  const designationSuggestion =
    filters.availableTypes
      .map((type) => ({ type, score: scoreChoice(type, haystack) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.type.localeCompare(b.type))[0]?.type ||
    filters.availableTypes.find((type) => /article/i.test(type)) ||
    filters.availableTypes[0] ||
    'Article';

  const title = titleFromText(rawText);

  return {
    title,
    summary: summaryFromText(rawText),
    bodyText: rawText,
    contentDesignation: designationSuggestion,
    type: 'Article',
    tags: tagSuggestions,
    author: authorFromText(rawText),
    filename: cleanFilename(undefined, title),
    publishedAt: new Date().toISOString().slice(0, 10),
    recommendedAudience: '',
    sourceUrl,
  };
}

function normalizeTags(values: string[], availableTags: string[], fallbackTags: string[]) {
  const normalizedTags = new Map(availableTags.map((tag) => [normalizeForMatch(tag), tag]));
  const selected: string[] = [];

  for (const value of values) {
    const match = normalizedTags.get(normalizeForMatch(value));
    if (match && !selected.some((tag) => normalizeForMatch(tag) === normalizeForMatch(match))) selected.push(match);
    if (selected.length >= 3) break;
  }

  for (const tag of fallbackTags) {
    if (!selected.some((selectedTag) => normalizeForMatch(selectedTag) === normalizeForMatch(tag))) selected.push(tag);
    if (selected.length >= 3) break;
  }

  return selected.slice(0, 3);
}

function normalizeDate(value: string | undefined, fallback: string) {
  if (!value?.trim()) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString().slice(0, 10);
}

async function readFilters() {
  const fallback = {
    availableTags: Array.from(new Set(MOCK_SOURCE_CONTENT.flatMap((content) => content.tags))).sort((a, b) => a.localeCompare(b)),
    availableTypes: Array.from(new Set(MOCK_SOURCE_CONTENT.map((content) => content.type).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    availableAuthors: Array.from(new Set(MOCK_SOURCE_CONTENT.map((content) => content.author).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    availablePublishers: Array.from(new Set(MOCK_SOURCE_CONTENT.map((content) => content.publisher).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
  };

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('source_content_stats')
      .select('value')
      .eq('key', 'source_filters')
      .maybeSingle();

    if (error || !data?.value) return fallback;
    return normalizeCachedFilters(data.value);
  } catch {
    return fallback;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawText = normalizeText(body?.text);
    const sourceUrl = String(body?.sourceUrl || '').trim();
    const mode = body?.mode === 'ai' ? 'ai' : 'quick';

    if (rawText.length < 40) {
      return NextResponse.json({ error: 'Paste at least 40 characters before scanning.' }, { status: 400 });
    }

    const filters = await readFilters();
    const quick = quickDraft(rawText, sourceUrl, filters);

    if (mode === 'quick') {
      return NextResponse.json({
        draft: quick,
        filters,
        scan: {
          mode: 'quick',
          confidence: null,
          warnings: ['Quick Scan uses local keyword matching and simple extraction. No AI tokens were used.'],
        },
      });
    }

    const env = getServerEnv();
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const result = await generateObject({
      model: openai(env.OPENAI_MODEL),
      schema: AiScanSchema,
      temperature: 0.15,
      prompt: [
        'You extract source-content metadata for an internal financial-services editorial library.',
        'Return only the schema fields requested. Do not create system IDs, BAS content IDs, FINRA approval, evergreen values, arbitrary metadata, or database-only fields.',
        'Use the pasted content as evidence. If a field is not present, use an empty string and add a short warning.',
        '',
        'Fields to infer:',
        '- title: concise source title.',
        '- summary: neutral factual summary, maximum 300 characters.',
        '- contentDesignation: choose exactly one approved designation from the list.',
        '- type: choose exactly one broad content type from the list.',
        '- tags: choose 1 to 3 exact approved tags from the tag list. Do not invent tags.',
        '- author: only if clearly present in the pasted content.',
        '- publishedAt: YYYY-MM-DD only if clearly present.',
        '- filename: short human-readable .txt filename based on title.',
        '- recommendedAudience: short audience fit, only if supported by the content.',
        '- confidence: 0 to 1 confidence in the extracted fields.',
        '- warnings: concise review notes for missing/uncertain fields.',
        '',
        `Approved content designations: ${filters.availableTypes.join(', ') || 'Article'}`,
        `Approved content types: ${CONTENT_TYPE_OPTIONS.join(', ')}`,
        `Approved tags: ${filters.availableTags.slice(0, 600).join(', ') || 'No approved tags available'}`,
        '',
        'Pasted content:',
        rawText.slice(0, 18000),
      ].join('\n'),
    });

    const ai = result.object;
    const contentDesignation = normalizeChoice(ai.contentDesignation, filters.availableTypes, quick.contentDesignation);
    const type = normalizeChoice(ai.type, CONTENT_TYPE_OPTIONS, quick.type);
    const tags = normalizeTags(ai.tags || [], filters.availableTags, quick.tags);
    const title = ai.title.trim() || quick.title;
    const warnings = [
      ...((ai.warnings || []).map((warning) => warning.trim()).filter(Boolean)),
      ...(tags.length ? [] : ['No approved tag could be selected automatically. Choose at least one tag before saving.']),
    ].slice(0, 6);

    const draft = {
      title,
      summary: (ai.summary.trim() || quick.summary).slice(0, 300),
      bodyText: rawText,
      contentDesignation,
      type,
      tags,
      author: ai.author?.trim() || quick.author,
      filename: cleanFilename(ai.filename, title),
      publishedAt: normalizeDate(ai.publishedAt, quick.publishedAt),
      recommendedAudience: ai.recommendedAudience?.trim() || '',
      sourceUrl,
    };

    await recordGenerationEvent({
      tool: 'content-upload',
      contentType: 'ai-scan',
      category: 'content',
      assetCount: 1,
      model: env.OPENAI_MODEL,
      meta: {
        mode: 'ai-scan',
        pastedCharacterCount: rawText.length,
        confidence: ai.confidence,
        warningCount: warnings.length,
        ...normalizeGenerationUsage(result.usage),
      },
    });

    return NextResponse.json({
      draft,
      filters,
      scan: {
        mode: 'ai',
        confidence: ai.confidence,
        warnings,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to scan pasted content.' }, { status: 500 });
  }
}
