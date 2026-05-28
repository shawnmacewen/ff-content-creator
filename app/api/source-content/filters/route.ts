import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const pageSize = 1000;
    let page = 0;
    const availableTypes = new Set<string>();
    const availableAuthors = new Set<string>();
    const availablePublishers = new Set<string>();
    const availableTags = new Set<string>();

    while (true) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from('source_content')
        .select('content_designation,tags,author,publisher,source_system')
        .range(from, to);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const rows = data || [];
      for (const row of rows) {
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

      if (rows.length < pageSize) break;
      page += 1;
    }

    return NextResponse.json({
      availableTags: Array.from(availableTags).sort((a, b) => a.localeCompare(b)),
      availableTypes: Array.from(availableTypes).sort((a, b) => a.localeCompare(b)),
      availableAuthors: Array.from(availableAuthors).sort((a, b) => a.localeCompare(b)),
      availablePublishers: Array.from(availablePublishers).sort((a, b) => a.localeCompare(b)),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load source content filters' }, { status: 500 });
  }
}
