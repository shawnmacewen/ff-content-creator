import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { MOCK_SOURCE_CONTENT } from '@/lib/api/source-content-mock';

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

export async function GET() {
  const fallback = () => NextResponse.json({
    availableTags: Array.from(new Set(MOCK_SOURCE_CONTENT.flatMap((content) => content.tags))).sort((a, b) => a.localeCompare(b)),
    availableTypes: Array.from(new Set(MOCK_SOURCE_CONTENT.map((content) => content.type).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    availableAuthors: Array.from(new Set(MOCK_SOURCE_CONTENT.map((content) => content.author).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    availablePublishers: Array.from(new Set(MOCK_SOURCE_CONTENT.map((content) => content.publisher).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    fallback: true,
  });

  try {
    const supabase = getSupabaseServerClient();
    const pageSize = 300;
    const availableTypes = new Set<string>();
    const availableAuthors = new Set<string>();
    const availablePublishers = new Set<string>();
    const availableTags = new Set<string>();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const { data, error } = await (async () => {
      try {
        return await supabase
          .from('source_content')
          .select('content_designation,tags,author,publisher,source_system')
          .order('published_at', { ascending: false, nullsFirst: false })
          .limit(pageSize)
          .abortSignal(controller.signal);
      } finally {
        clearTimeout(timeout);
      }
    })();

    if (error) {
      return fallback();
    }

    for (const row of data || []) {
      if (row.content_designation) availableTypes.add(row.content_designation);
      if (row.author) availableAuthors.add(row.author);

      const publisher = row.publisher || (row.source_system === 'sample-seed' ? 'sample' : null);
      if (publisher) availablePublishers.add(publisher);

      const tags = Array.isArray(row.tags) ? row.tags : [];
      for (const tag of tags) {
        const decoded = decodeHtmlEntities(String(tag || '')).trim();
        if (decoded) availableTags.add(decoded);
      }
    }

    return NextResponse.json({
      availableTags: Array.from(availableTags).sort((a, b) => a.localeCompare(b)),
      availableTypes: Array.from(availableTypes).sort((a, b) => a.localeCompare(b)),
      availableAuthors: Array.from(availableAuthors).sort((a, b) => a.localeCompare(b)),
      availablePublishers: Array.from(availablePublishers).sort((a, b) => a.localeCompare(b)),
    });
  } catch {
    return fallback();
  }
}
