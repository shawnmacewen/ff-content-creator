import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { MOCK_SOURCE_CONTENT } from '@/lib/api/source-content-mock';
import { normalizeCachedFilters } from '@/lib/source-content/stats';

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

    if (rawText.length < 40) {
      return NextResponse.json({ error: 'Paste at least 40 characters before scanning.' }, { status: 400 });
    }

    const filters = await readFilters();
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

    return NextResponse.json({
      draft: {
        title,
        summary: summaryFromText(rawText),
        bodyText: rawText,
        contentDesignation: designationSuggestion,
        type: designationSuggestion,
        tags: tagSuggestions,
        author: '',
        filename: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'custom-content'}.txt`,
        publishedAt: new Date().toISOString().slice(0, 10),
        recommendedAudience: '',
        sourceUrl,
      },
      filters,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to scan pasted content.' }, { status: 500 });
  }
}
