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

function normalizeBody(input: string): string {
  const decoded = decodeHtmlEntities(input || '');
  return decoded
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || undefined;
  const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
  const author = searchParams.get('author') || undefined;
  const publisher = searchParams.get('publisher') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = getSupabaseServerClient();

  let dbQuery = supabase
    .from('source_content')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (query) dbQuery = dbQuery.or(`title.ilike.%${query}%,body.ilike.%${query}%`);
  if (type) dbQuery = dbQuery.eq('type', type);
  if (author) dbQuery = dbQuery.eq('author', author);
  if (publisher && publisher !== 'all') dbQuery = dbQuery.eq('publisher', publisher);
  if (tags.length) dbQuery = dbQuery.overlaps('tags', tags);

  const { data, count, error } = await dbQuery.range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allRows = (await supabase.from('source_content').select('type,tags,author,source_system,updated_at')).data || [];

  const availableTypes = Array.from(new Set(allRows.map((r) => r.type).filter(Boolean)));
  const availableAuthors = Array.from(new Set(allRows.map((r) => r.author).filter(Boolean)));
  const availablePublishers = Array.from(new Set(allRows.map((r: any) => r.publisher).filter(Boolean)));
  const availableTags = Array.from(new Set(allRows.flatMap((r) => r.tags || [])));

  const mapped = (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    body: normalizeBody(row.body || ''),
    excerpt: normalizeBody(row.metadata?.excerpt || row.body || '').slice(0, 220),
    type: row.type,
    tags: row.tags || [],
    publishedAt: row.published_at || null,
    author: row.source_system === 'sample-seed' ? 'Sample' : (row.author || 'Unknown'),
    url: row.metadata?.url || null,
    imageUrl: row.metadata?.imageUrl || null,
    sourceSystem: row.source_system || null,
    publisher: row.publisher || (row.source_system === 'sample-seed' ? 'sample' : null),
  }));

  const sourceCounts = allRows.reduce((acc: Record<string, number>, r: any) => {
    const key = r.source_system || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const lastSyncedAt = allRows
    .map((r: any) => r.updated_at)
    .filter(Boolean)
    .sort()
    .pop() || null;

  return NextResponse.json({
    data: mapped,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
    filters: { availableTags, availableTypes, availableAuthors, availablePublishers },
    meta: { sourceCounts, lastSyncedAt },
  });
}
