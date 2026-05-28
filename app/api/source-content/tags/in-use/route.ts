import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function normalizeTag(input: string) {
  return decodeHtmlEntities(input)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function sourceFilenameForRow(row: any) {
  return decodeHtmlEntities(String(
    row.bas_content_filename ||
    row.metadata?.extraPropertiesSelected?.BasContentFilename ||
    row.metadata?.raw?.files?.title ||
    row.metadata?.raw?.files?.[0]?.title ||
    row.title ||
    row.id ||
    'Untitled source'
  )).trim();
}

export async function GET(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get('tag') || '';
  const normalizedTag = normalizeTag(tag);

  if (!normalizedTag) {
    return NextResponse.json({ error: 'Missing tag' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const pageSize = 1000;
  let page = 0;
  const sourceItems = new Map<string, { id: string; title: string; filename: string }>();

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('source_content')
      .select('id,title,bas_content_filename,metadata,tags')
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data || [];
    for (const row of rows) {
      const tags = Array.isArray(row.tags) ? row.tags : [];
      const hasTag = tags.some((rawTag) => normalizeTag(String(rawTag || '')) === normalizedTag);
      if (!hasTag) continue;

      sourceItems.set(row.id, {
        id: row.id,
        title: decodeHtmlEntities(String(row.title || 'Untitled source')).trim(),
        filename: sourceFilenameForRow(row),
      });
    }

    if (rows.length < pageSize) break;
    page += 1;
  }

  return NextResponse.json({
    tag: normalizedTag,
    sourceItems: Array.from(sourceItems.values())
      .sort((a, b) => a.filename.localeCompare(b.filename) || a.title.localeCompare(b.title)),
  });
}
