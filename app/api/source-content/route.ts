import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { MOCK_SOURCE_CONTENT } from '@/lib/api/source-content-mock';
import { decodeHtmlEntities, getCanonicalBody } from '@/lib/source-content/body';
import { emptySourceContentSummary, normalizeCachedSummary } from '@/lib/source-content/stats';

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
  const body = getCanonicalBody(row).toLowerCase();
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
  const canonicalBody = getCanonicalBody(row);
  const excerpt = String(metadata.excerpt || canonicalBody || '').slice(0, 220);

  return {
    id: row.id,
    title: decodeHtmlEntities(row.title || ''),
    body: canonicalBody,
    bodyText: row.body_text || canonicalBody || null,
    excerpt,
    type: row.content_designation ?? row.type ?? null,
    tags: (row.tags || []).map((t: string) => decodeHtmlEntities(String(t))),
    keyTakeaways: Array.isArray(row.key_takeaways) ? row.key_takeaways.map((item: string) => decodeHtmlEntities(String(item))).filter(Boolean) : [],
    recommendedAudience: row.recommended_audience ? decodeHtmlEntities(String(row.recommended_audience)) : null,
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

function applyDefaultSourceContentOrder(query: any): any {
  return query
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false });
}

async function withDatabaseTimeout<T>(run: (signal: AbortSignal) => PromiseLike<T>, timeoutMs = 4500): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function readCachedSummary(supabase: ReturnType<typeof getSupabaseServerClient>) {
  try {
    const { data, error } = await supabase
      .from('source_content_stats')
      .select('value,refreshed_at')
      .eq('key', 'source_summary')
      .maybeSingle();

    if (error || !data?.value) return emptySourceContentSummary;
    return normalizeCachedSummary(data.value);
  } catch {
    return emptySourceContentSummary;
  }
}

function fallbackSourceContentResponse(args: {
  query: string;
  contentDesignation?: string;
  tags: string[];
  publisher?: string;
  page: number;
  pageSize: number;
  reason: string;
}) {
  const query = args.query.trim().toLowerCase();
  const tagSet = new Set(args.tags.map((tag) => tag.toLowerCase()));
  const filtered = MOCK_SOURCE_CONTENT.filter((content) => {
    const typeOk = !args.contentDesignation || args.contentDesignation === 'all' || content.type === args.contentDesignation;
    const publisherOk = !args.publisher || args.publisher === 'all' || content.publisher === args.publisher;
    const tagOk = !tagSet.size || content.tags.some((tag) => tagSet.has(tag.toLowerCase()));
    const queryOk = !query || `${content.title} ${content.body} ${content.tags.join(' ')}`.toLowerCase().includes(query);
    return typeOk && publisherOk && tagOk && queryOk;
  });

  const from = (args.page - 1) * args.pageSize;
  const pageItems = filtered.slice(from, from + args.pageSize);

  return NextResponse.json({
    data: pageItems,
    total: filtered.length,
    page: args.page,
    pageSize: args.pageSize,
    totalPages: Math.max(1, Math.ceil(filtered.length / args.pageSize)),
    hasNextPage: from + args.pageSize < filtered.length,
    filters: { availableTags: [], availableTypes: [], availableAuthors: [], availablePublishers: [] },
    meta: {
      sourceCounts: { fallback: filtered.length },
      publisherCounts: {},
      finraReviewedCount: 0,
      lastSyncedAt: null,
      fallback: true,
      fallbackReason: args.reason,
    },
  });
}

export async function GET(request: NextRequest) {
  let fallbackArgs: Omit<Parameters<typeof fallbackSourceContentResponse>[0], 'reason'> | null = null;

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
    fallbackArgs = { query, contentDesignation, tags, publisher, page, pageSize };

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
      'key_takeaways',
      'recommended_audience',
    ].join(',');

    let dbQuery = applyDefaultSourceContentOrder(supabase
      .from('source_content')
      .select(query ? `${listColumns},body_text,body` : listColumns));

    if (contentDesignation && contentDesignation !== 'all') dbQuery = dbQuery.eq('content_designation', contentDesignation);
    if (author) dbQuery = dbQuery.eq('author', author);
    if (publisher && publisher !== 'all') dbQuery = dbQuery.eq('publisher', publisher);
    if (tags.length) dbQuery = dbQuery.overlaps('tags', tags);

    let data: any[] | null = null;
    let count: number | null = 0;
    let error: any = null;

    if (query) {
      const { tokens, expanded } = parseIntentTokens(query);
      const { data: candidateRows, error: candidateErr } = await withDatabaseTimeout<any>((signal) => (
        dbQuery.abortSignal(signal).range(0, 199)
      ));
      if (candidateErr) {
        return fallbackSourceContentResponse({
          ...fallbackArgs,
          reason: candidateErr.message || 'database-error',
        });
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
      const normal = await withDatabaseTimeout<any>((signal) => dbQuery.abortSignal(signal).range(from, to));
      data = normal.data as any[] | null;
      count = null;
      error = normal.error;
    }

    if (error) {
      return fallbackSourceContentResponse({
        ...fallbackArgs,
        reason: error.message || 'database-error',
      });
    }

    const rows = data || [];
    const hasNextPage = rows.length > pageSize;
    const pageRows = rows.slice(0, pageSize);
    const mapped = pageRows.map(mapSourceContentRow);
    const total = count ?? (from + mapped.length + (hasNextPage ? 1 : 0));
    const summary = await readCachedSummary(supabase);

    return NextResponse.json({
      data: mapped,
      total,
      page,
      pageSize,
      totalPages: hasNextPage ? page + 1 : page,
      hasNextPage,
      filters: { availableTags: [], availableTypes: [], availableAuthors: [], availablePublishers: [] },
      meta: {
        sourceCounts: summary.sourceCounts,
        publisherCounts: summary.publisherCounts,
        finraReviewedCount: summary.finraReviewedCount,
        lastSyncedAt: summary.lastSyncedAt,
        totalSourceContent: summary.totalSourceContent,
      },
    });
  } catch (error: any) {
    if (fallbackArgs) {
      return fallbackSourceContentResponse({
        ...fallbackArgs,
        reason: error?.name === 'AbortError' ? 'database-timeout' : (error?.message || 'database-error'),
      });
    }

    return NextResponse.json({ error: error?.message || 'Failed to load source content' }, { status: 500 });
  }
}
