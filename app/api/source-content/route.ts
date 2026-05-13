import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || undefined;
  const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
  const author = searchParams.get('author') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = getSupabaseServerClient();

  let dbQuery = supabase.from('source_content').select('*', { count: 'exact' }).order('created_at', { ascending: false });

  if (query) dbQuery = dbQuery.or(`title.ilike.%${query}%,body.ilike.%${query}%`);
  if (type) dbQuery = dbQuery.eq('type', type);
  if (author) dbQuery = dbQuery.eq('author', author);
  if (tags.length) dbQuery = dbQuery.overlaps('tags', tags);

  const { data, count, error } = await dbQuery.range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allRows = (await supabase.from('source_content').select('type,tags,author')).data || [];

  const availableTypes = Array.from(new Set(allRows.map((r) => r.type).filter(Boolean)));
  const availableAuthors = Array.from(new Set(allRows.map((r) => r.author).filter(Boolean)));
  const availableTags = Array.from(new Set(allRows.flatMap((r) => r.tags || [])));

  const mapped = (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    excerpt: row.metadata?.excerpt || row.body?.slice(0, 220) || '',
    type: row.type,
    tags: row.tags || [],
    publishedAt: row.published_at || row.created_at,
    author: row.source_system === 'sample-seed' ? 'Sample' : (row.author || 'Unknown'),
    url: row.metadata?.url || null,
    imageUrl: row.metadata?.imageUrl || null,
    sourceSystem: row.source_system || null,
  }));

  return NextResponse.json({
    data: mapped,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
    filters: { availableTags, availableTypes, availableAuthors },
  });
}
