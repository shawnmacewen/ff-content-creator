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

function safeMetadata(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function mapSourceContentRow(row: any) {
  const metadata = safeMetadata(row.metadata);
  const extraPropertiesSelected = safeMetadata(metadata.extraPropertiesSelected);

  return {
    id: row.id,
    title: decodeHtmlEntities(row.title || ''),
    body: row.body ? normalizeBody(row.body) : '',
    excerpt: normalizeBody(metadata.excerpt || row.body || '').slice(0, 220),
    type: row.content_designation ?? row.type ?? null,
    tags: (row.tags || []).map((t: string) => decodeHtmlEntities(String(t))),
    publishedAt: row.published_at || null,
    author: row.source_system === 'sample-seed' ? 'Sample' : (row.author || 'Unknown'),
    url: metadata.url || null,
    imageUrl: metadata.imageUrl || null,
    sourceSystem: row.source_system || null,
    publisher: row.publisher || (row.source_system === 'sample-seed' ? 'sample' : null),
    externalId: row.external_id || null,
    metadata: {
      ...metadata,
      contentDesignation: row.content_designation ?? metadata.contentDesignation ?? row.type ?? null,
      categories: row.categories ?? metadata.categories ?? [],
      subCategories: row.sub_categories ?? metadata.subCategories ?? [],
      extraPropertiesSelected: {
        ...extraPropertiesSelected,
        BasContentId: row.bas_content_id ?? extraPropertiesSelected.BasContentId ?? null,
        BasContentFilename: row.bas_content_filename ?? extraPropertiesSelected.BasContentFilename ?? null,
        Format: row.content_format ?? extraPropertiesSelected.Format ?? null,
        FinraLetterUrl: row.finra_letter_url ?? extraPropertiesSelected.FinraLetterUrl ?? null,
        FinraApproved: row.finra_approved ?? extraPropertiesSelected.FinraApproved ?? null,
        APContentType: row.ap_content_type ?? extraPropertiesSelected.APContentType ?? null,
        Evergreen: row.evergreen ?? extraPropertiesSelected.Evergreen ?? null,
      },
    },
  };
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
    const to = from + pageSize;

    const supabase = getSupabaseServerClient();
    const listColumns = [
      'id',
      'title',
      'metadata',
      'type',
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
      .select(query ? `${listColumns},body` : listColumns)
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
      const { data: candidateRows, error: candidateErr } = await dbQuery.range(0, 199);
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
      count = null;
      error = normal.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data || [];
    const hasNextPage = rows.length > pageSize;
    const pageRows = rows.slice(0, pageSize);
    const mapped = pageRows.map(mapSourceContentRow);
    const total = count ?? (from + mapped.length + (hasNextPage ? 1 : 0));

    return NextResponse.json({
      data: mapped,
      total,
      page,
      pageSize,
      totalPages: hasNextPage ? page + 1 : page,
      hasNextPage,
      filters: { availableTags: [], availableTypes: [], availableAuthors: [], availablePublishers: [] },
      meta: {
        sourceCounts: {},
        publisherCounts: {},
        finraReviewedCount: 0,
        lastSyncedAt: null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load source content' }, { status: 500 });
  }
}
