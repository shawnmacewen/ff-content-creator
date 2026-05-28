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

function parseIntentTokens(query: string) {
  const cleaned = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const stopWords = new Set(['the', 'a', 'an', 'of', 'on', 'in', 'to', 'for', 'and', 'or', 'with', 'about', 'show', 'me', 'articles', 'article', 'content', 'want', 'see']);
  const tokens = Array.from(new Set(cleaned.split(/\s+/).map((t) => t.trim()).filter((t) => t.length > 2 && !stopWords.has(t))));

  const synonymMap: Record<string, string[]> = {
    war: ['conflict', 'geopolitical'],
    oil: ['energy', 'crude', 'petroleum'],
    prices: ['pricing', 'inflation', 'market'],
    impact: ['effect', 'effects', 'influence'],
    advisor: ['adviser', 'financial advisor'],
    advisors: ['adviser', 'financial advisor'],
    switching: ['switch', 'change', 'transition'],
    ai: ['artificial intelligence', 'machine learning'],
    economy: ['economic', 'markets', 'macro'],
  };

  const expanded = new Set(tokens);
  for (const t of tokens) for (const s of synonymMap[t] || []) expanded.add(s);
  return { tokens, expanded: Array.from(expanded) };
}

function scoreRowForIntent(row: any, query: string, tokens: string[], expanded: string[]) {
  const title = String(row.title || '').toLowerCase();
  const body = String(row.body || '').toLowerCase();
  const q = query.toLowerCase();

  let score = 0;
  if (title.includes(q)) score += 20;
  if (body.includes(q)) score += 10;

  let coreMatches = 0;
  for (const t of tokens) {
    if (title.includes(t)) { score += 6; coreMatches += 1; }
    else if (body.includes(t)) { score += 3; coreMatches += 1; }
  }

  for (const t of expanded) {
    if (tokens.includes(t)) continue;
    if (title.includes(t)) score += 2;
    else if (body.includes(t)) score += 1;
  }

  return { score, coreMatches };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const query = searchParams.get('q') || '';
    const contentDesignation = searchParams.get('contentDesignation') || searchParams.get('type') || undefined;
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const author = searchParams.get('author') || undefined;
    const publisher = searchParams.get('publisher') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10) || 10));

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = getSupabaseServerClient();
    const listColumns = [
      'id',
      'title',
      'body',
      'metadata',
      'content_designation',
      'tags',
      'published_at',
      'author',
      'source_system',
      'publisher',
      'external_id',
      'bas_content_id',
      'bas_content_filename',
      'content_format',
      'finra_letter_url',
      'finra_approved',
      'ap_content_type',
      'evergreen',
      'categories',
      'sub_categories',
    ].join(',');

    let dbQuery = supabase
      .from('source_content')
      .select(listColumns, { count: 'exact' })
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (contentDesignation && contentDesignation !== 'all') dbQuery = dbQuery.eq('content_designation', contentDesignation);
    if (author) dbQuery = dbQuery.eq('author', author);
    if (publisher && publisher !== 'all') dbQuery = dbQuery.eq('publisher', publisher);
    if (tags.length) dbQuery = dbQuery.overlaps('tags', tags);

    let data: any[] | null = null;
    let count: number | null = 0;
    let error: any = null;

    if (query) {
      const { tokens, expanded } = parseIntentTokens(query);
      const { data: candidateRows, error: candidateErr } = await dbQuery.range(0, 999);
      if (candidateErr) {
        error = candidateErr;
      } else {
        const scored = ((candidateRows || []) as any[])
          .map((row) => {
            const { score, coreMatches } = scoreRowForIntent(row, query, tokens, expanded);
            return { row, score, coreMatches };
          })
          .filter((item) => item.score > 0 && (tokens.length <= 1 || item.coreMatches >= Math.min(2, tokens.length)))
          .sort((a, b) => b.score - a.score || Number(new Date(b.row.published_at || 0)) - Number(new Date(a.row.published_at || 0)));

        const sliced = scored.slice(from, to + 1).map((s) => s.row);
        data = sliced;
        count = scored.length;
      }
    } else {
      const normal = await dbQuery.range(from, to);
      data = normal.data as any[] | null;
      count = normal.count;
      error = normal.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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

    const [finraResult, lastSyncResult] = await Promise.all([
      supabase
        .from('source_content')
        .select('id', { count: 'exact', head: true })
        .eq('finra_approved', true),
      supabase
        .from('source_content')
        .select('updated_at')
        .not('updated_at', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      data: mapped,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      filters: { availableTags: [], availableTypes: [], availableAuthors: [], availablePublishers: [] },
      meta: {
        sourceCounts: {},
        publisherCounts: {},
        finraReviewedCount: finraResult.count || 0,
        lastSyncedAt: (lastSyncResult.data as any)?.updated_at || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load source content' }, { status: 500 });
  }
}
