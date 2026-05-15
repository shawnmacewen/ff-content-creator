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
    // structure-friendly replacements
    .replace(/<\/?(section|container|article|corpus)[^>]*>/gi, '\n\n')
    .replace(/<container_text[^>]*>([\s\S]*?)<\/container_text>/gi, '\n\n$1\n')
    .replace(/<document_title[^>]*>([\s\S]*?)<\/document_title>/gi, '\n\n$1\n')
    .replace(/<short_title[^>]*>([\s\S]*?)<\/short_title>/gi, '\n\n$1\n')
    .replace(/<paragraph[^>]*>([\s\S]*?)<\/paragraph>/gi, '$1\n\n')
    .replace(/<crossreference[^>]*>([\s\S]*?)<\/crossreference>/gi, '$1')
    // basic emphasis preservation (markdown-ish)
    .replace(/<(b|strong)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(i|em)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
    // strip remaining tags
    .replace(/<[^>]+>/g, ' ')
    // normalize whitespace while preserving paragraph breaks
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const query = searchParams.get('q') || '';
  const contentDesignation = searchParams.get('contentDesignation') || searchParams.get('type') || undefined;
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
  if (contentDesignation && contentDesignation !== 'all') dbQuery = dbQuery.eq('content_designation', contentDesignation);
  if (author) dbQuery = dbQuery.eq('author', author);
  if (publisher && publisher !== 'all') dbQuery = dbQuery.eq('publisher', publisher);
  if (tags.length) dbQuery = dbQuery.overlaps('tags', tags);

  const { data, count, error } = await dbQuery.range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allRows = (await supabase.from('source_content').select('content_designation,tags,author,publisher,source_system,updated_at')).data || [];

  const availableDesignations = Array.from(new Set(allRows.map((r: any) => r.content_designation).filter(Boolean)));
  const availableAuthors = Array.from(new Set(allRows.map((r) => r.author).filter(Boolean)));
  const availablePublishers = Array.from(new Set(allRows.map((r: any) => r.publisher || (r.source_system === 'sample-seed' ? 'sample' : null)).filter(Boolean)));
  const availableTags = Array.from(new Set(allRows.flatMap((r) => (r.tags || []).map((t: string) => decodeHtmlEntities(String(t))))));

  const mapped = (data || []).map((row: any) => ({
    id: row.id,
    title: decodeHtmlEntities(row.title || ''),
    body: normalizeBody(row.body || ''),
    excerpt: normalizeBody(row.metadata?.excerpt || row.body || '').slice(0, 220),
    type: row.content_designation ?? null,
    tags: (row.tags || []).map((t: string) => decodeHtmlEntities(String(t))),
    publishedAt: row.published_at || null,
    author: row.source_system === 'sample-seed' ? 'Sample' : (row.author || 'Unknown'),
    url: row.metadata?.url || null,
    imageUrl: row.metadata?.imageUrl || null,
    sourceSystem: row.source_system || null,
    publisher: row.publisher || (row.source_system === 'sample-seed' ? 'sample' : null),
    externalId: row.external_id || null,
    metadata: {
      ...(row.metadata || {}),
      contentDesignation: row.content_designation ?? row.metadata?.contentDesignation ?? null,
      categories: row.categories ?? row.metadata?.categories ?? [],
      subCategories: row.sub_categories ?? row.metadata?.subCategories ?? [],
      extraPropertiesSelected: {
        BasContentId: row.bas_content_id ?? row.metadata?.extraPropertiesSelected?.BasContentId ?? null,
        BasContentFilename: row.bas_content_filename ?? row.metadata?.extraPropertiesSelected?.BasContentFilename ?? null,
        Format: row.content_format ?? row.metadata?.extraPropertiesSelected?.Format ?? null,
        FinraLetterUrl: row.finra_letter_url ?? row.metadata?.extraPropertiesSelected?.FinraLetterUrl ?? null,
        FinraApproved: row.finra_approved ?? row.metadata?.extraPropertiesSelected?.FinraApproved ?? null,
        APContentType: row.ap_content_type ?? row.metadata?.extraPropertiesSelected?.APContentType ?? null,
        Evergreen: row.evergreen ?? row.metadata?.extraPropertiesSelected?.Evergreen ?? null,
      },
    },
  }));

  const sourceCounts = allRows.reduce((acc: Record<string, number>, r: any) => {
    const key = r.source_system || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const publisherCounts = allRows.reduce((acc: Record<string, number>, r: any) => {
    const key = r.publisher || (r.source_system === 'sample-seed' ? 'sample' : 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Accurate count for Broadridge rows (all records, not capped by metadata list size)
  const { count: broadridgeCount } = await supabase
    .from('source_content')
    .select('id', { count: 'exact', head: true })
    .eq('publisher', 'broadridge-forefield');
  publisherCounts['broadridge-forefield'] = broadridgeCount || 0;
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
    filters: { availableTags, availableTypes: availableDesignations, availableAuthors, availablePublishers },
    meta: { sourceCounts, publisherCounts, lastSyncedAt },
  });
}
