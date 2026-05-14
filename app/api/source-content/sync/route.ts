import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  getAdvisorStreamConfig,
  getAdvisorStreamAccessToken,
  mapAdvisorStreamSearchResults,
  searchAdvisorStreamArticles,
  validateAdvisorStreamConfig,
} from '@/lib/integrations/advisorstream/provider';
import { appendSyncLog } from '@/lib/source-sync-logs';

async function fetchAdvisorStreamArticleById(baseUrl: string, token: string, articleId: string) {
  const base = baseUrl.replace(/\/$/, '');
  const response = await fetch(`${base}/wealth-management/advisor-content/v3/bas-content-api/articles/${encodeURIComponent(articleId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) return null;
  return response.json();
}

function coalesceEffectiveDate(input: any, publisher?: string | null): string | null {
  const isForefield = publisher === 'broadridge-forefield';
  const directCandidates = isForefield
    ? [
        input?.effective_date,
        input?.Effective_date,
        input?.data?.effective_date,
        input?.data?.Effective_date,
        input?.article?.effective_date,
        input?.article?.Effective_date,
        input?.publish_date,
        input?.published_date,
        input?.published_at,
        input?.publication_date,
        input?.data?.publish_date,
        input?.data?.published_date,
        input?.data?.published_at,
        input?.data?.publication_date,
        input?.article?.publish_date,
        input?.article?.published_date,
        input?.article?.published_at,
        input?.article?.publication_date,
      ]
    : [
        input?.publish_date,
        input?.published_date,
        input?.published_at,
        input?.publication_date,
        input?.effective_date,
        input?.Effective_date,
        input?.data?.publish_date,
        input?.data?.published_date,
        input?.data?.published_at,
        input?.data?.publication_date,
        input?.data?.effective_date,
        input?.data?.Effective_date,
        input?.article?.publish_date,
        input?.article?.published_date,
        input?.article?.published_at,
        input?.article?.publication_date,
        input?.article?.effective_date,
        input?.article?.Effective_date,
      ];

  for (const value of directCandidates) {
    const d = new Date(value as string);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  const queue: any[] = [input];
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== 'object') continue;

    for (const [key, val] of Object.entries(node)) {
      if (val && typeof val === 'object') queue.push(val);
      if (typeof val !== 'string') continue;

      const normalizedKey = key.toLowerCase();
      const looksLikeDateField =
        normalizedKey.includes('effective') ||
        normalizedKey.includes('publish') ||
        normalizedKey.includes('publication');

      if (!looksLikeDateField) continue;

      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }

  return null;
}

interface SyncRequestBody {
  mode?: 'sample-seed' | 'provider' | 'provider-backfill';
  dryRun?: boolean;
  forceDetailDateRefresh?: boolean;
  yearsBack?: number;
  forefieldOnly?: boolean;
  maxPages?: number;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as SyncRequestBody;
  const mode = body.mode || 'sample-seed';
  const dryRun = !!body.dryRun;
  const forceDetailDateRefresh = !!body.forceDetailDateRefresh;
  const yearsBack = Math.min(10, Math.max(1, Number(body.yearsBack) || 3));
  const forefieldOnly = body.forefieldOnly !== false;
  const maxPages = Math.max(1, Number(body.maxPages) || 250);
  const minPublishedAtIso = new Date(new Date().setUTCFullYear(new Date().getUTCFullYear() - yearsBack)).toISOString();
  const runId = `sync_${Date.now()}`;

  let rows: any[] = [];
  let detailFetchSuccess = 0;
  let detailFetchMiss = 0;
  let detailDateMapped = 0;
  let detailPublisherMapped = 0;

  if (mode === 'sample-seed') {
    const raw = await readFile(process.cwd() + '/data/content-samples-export.json', 'utf8');
    const parsed = JSON.parse(raw);
    const source = Array.isArray(parsed?.sourceContent) ? parsed.sourceContent : [];

    rows = source.map((item: any) => ({
      external_id: item.id,
      source_system: 'sample-seed',
      publisher: 'sample',
      type: item.type || 'article',
      title: item.title || 'Untitled',
      body: item.body || item.summary || '',
      author: item.author || null,
      tags: Array.isArray(item.tags) ? item.tags : [],
      published_at: item.publishedAt || null,
      metadata: {
        excerpt: item.excerpt || null,
        url: item.url || null,
        imageUrl: item.imageUrl || null,
        importedFrom: 'data/content-samples-export.json',
      },
    }));
  } else if (mode === 'provider') {
    const config = getAdvisorStreamConfig();
    if (!validateAdvisorStreamConfig(config)) {
      return NextResponse.json(
        { ok: false, error: 'AdvisorStream env vars are not fully configured' },
        { status: 400 }
      );
    }

    try {
      const token = await getAdvisorStreamAccessToken(config);
      const pageSize = 25;
      const collected: any[] = [];
      let offset = 0;
      let totalItems = Number.MAX_SAFE_INTEGER;
      let lastPayload: any = null;
      let page = 0;

      while (offset < totalItems && page < maxPages) {
        const started = Date.now();
        const payload = await searchAdvisorStreamArticles(config, token, { limit: pageSize, offset, includeSourceFilter: false });
        lastPayload = payload;

        const rawCount =
          (payload as any)?.data?.size ??
          (payload as any)?.data?.records?.length ??
          (payload as any)?.results?.length ??
          (payload as any)?.items?.length ??
          0;

        const pageItems = mapAdvisorStreamSearchResults(payload);
        const publisherMatched = pageItems.filter((i) => String(i.publisher || '').toLowerCase() === 'broadridge-forefield').length;
        const dateMatched = pageItems.filter((i) => i.publishedAt && new Date(i.publishedAt).toISOString() >= minPublishedAtIso).length;
        await appendSyncLog({
          runId,
          mode,
          page,
          offset,
          fetched: rawCount,
          normalized: pageItems.length,
          publisherMatched,
          dateMatched,
          inserted: 0,
          updated: 0,
          skipped: Math.max(0, pageItems.length - Math.min(publisherMatched, dateMatched)),
          elapsedMs: Date.now() - started,
          createdAt: new Date().toISOString(),
        });
        collected.push(...pageItems);

        const payloadTotal = Number((payload as any)?.data?.totalItems ?? (payload as any)?.totalItems ?? 0);
        totalItems = Number.isFinite(payloadTotal) && payloadTotal > 0 ? payloadTotal : Math.max(totalItems, offset + rawCount);

        if (rawCount < pageSize) break;
        offset += pageSize;
        page += 1;
      }

      const normalized = collected
        .filter((item) => !forefieldOnly || String(item.publisher || '').toLowerCase() === 'broadridge-forefield');

      if (!normalized.length) {
        const payload = lastPayload || {};

        const maybeErrors = (payload as any)?.errors;
        return NextResponse.json({
          ok: true,
          mode,
          dryRun,
          processed: 0,
          inserted: 0,
          updated: 0,
          debug: {
            payloadKeys: Object.keys(payload || {}),
            payloadMeta: (payload as any)?.meta || null,
            payloadErrors: maybeErrors || null,
            dataType: Array.isArray((payload as any)?.data)
              ? 'array'
              : typeof (payload as any)?.data,
            dataKeys: (payload as any)?.data && typeof (payload as any)?.data === 'object'
              ? Object.keys((payload as any).data)
              : [],
            sampleKeys: Object.keys(
              (payload as any)?.results?.[0] ||
              (payload as any)?.items?.[0] ||
              (payload as any)?.data?.[0] ||
              (payload as any)?.data?.results?.[0] ||
              (payload as any)?.data?.items?.[0] ||
              (payload as any)?.data?.articles?.[0] ||
              (payload as any)?.data?.records?.[0] ||
              {}
            ),
          },
        });
      }

      rows = normalized.map((item) => ({
        external_id: item.externalId,
        source_system: item.sourceSystem,
        publisher: item.publisher || null,
        type: item.type,
        title: item.title,
        body: item.body,
        author: item.author || null,
        tags: item.tags || [],
        published_at: item.publishedAt || null,
        metadata: {
          excerpt: item.excerpt || null,
          url: item.url || null,
          imageUrl: item.imageUrl || null,
          ...item.metadata,
        },
      }));

      // Enrichment pass: fetch article details for missing published dates,
      // or force-refresh dates for all rows when requested.
      for (const row of rows) {
        if (!forceDetailDateRefresh && row.published_at) continue;

        const fallbackId =
          row.external_id ||
          row?.metadata?.raw?.articleId ||
          row?.metadata?.raw?.uuid ||
          null;

        if (!fallbackId) {
          detailFetchMiss += 1;
          continue;
        }

        const detail = await fetchAdvisorStreamArticleById(config.apiBaseUrl, token, fallbackId);
        if (!detail) {
          detailFetchMiss += 1;
          continue;
        }
        detailFetchSuccess += 1;

        const detailData = detail?.article?.data || detail?.data || detail;
        const detailSource = String(detailData?.source || '').trim().toLowerCase();

        // Canonical publisher classification from detail source
        const nextPublisher =
          detailSource === 'broadridge advisor content'
            ? 'broadridge-forefield'
            : (row.publisher || 'publisher-content');
        if (nextPublisher !== row.publisher) detailPublisherMapped += 1;
        row.publisher = nextPublisher;

        // Explicit date mapping for forefield -> effective_date, others -> publish_date first
        let mappedDate: string | null = null;
        if (row.publisher === 'broadridge-forefield') {
          mappedDate = coalesceEffectiveDate({
            effective_date: detailData?.effective_date,
            Effective_date: detailData?.Effective_date,
            data: detailData,
          }, row.publisher);
        } else {
          mappedDate = coalesceEffectiveDate({
            publish_date: detailData?.publish_date,
            published_date: detailData?.published_date,
            published_at: detailData?.published_at,
            publication_date: detailData?.publication_date,
            data: detailData,
          }, row.publisher);
        }

        if (mappedDate) {
          row.published_at = mappedDate;
          detailDateMapped += 1;
        }

        row.metadata = {
          ...(row.metadata || {}),
          detailFetched: true,
          detailSource: detailData?.source || null,
          detailMappedDate: row.published_at || null,
        };
      }
    } catch (error: any) {
      return NextResponse.json(
        { ok: false, error: error?.message || 'Provider sync failed' },
        { status: 502 }
      );
    }
  } else if (mode === 'provider-backfill') {
    const config = getAdvisorStreamConfig();
    if (!validateAdvisorStreamConfig(config)) {
      return NextResponse.json(
        { ok: false, error: 'AdvisorStream env vars are not fully configured' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { data: backfillRows, error: backfillError } = await supabase
      .from('source_content')
      .select('id, external_id, source_system, publisher, published_at, metadata')
      .eq('source_system', 'advisorstream')
      .or('publisher.is.null,published_at.is.null')
      .limit(200);

    if (backfillError) {
      return NextResponse.json({ ok: false, error: backfillError.message }, { status: 500 });
    }

    const token = await getAdvisorStreamAccessToken(config);
    const targets = backfillRows || [];

    for (const target of targets) {
      const fallbackId =
        target.external_id ||
        (target as any)?.metadata?.raw?.articleId ||
        (target as any)?.metadata?.raw?.uuid ||
        null;

      if (!fallbackId) {
        detailFetchMiss += 1;
        continue;
      }

      const detail = await fetchAdvisorStreamArticleById(config.apiBaseUrl, token, fallbackId);
      if (!detail) {
        detailFetchMiss += 1;
        continue;
      }
      detailFetchSuccess += 1;

      const detailData = detail?.article?.data || detail?.data || detail;
      const detailSource = String(detailData?.source || '').trim().toLowerCase();
      const publisher = detailSource === 'broadridge advisor content' ? 'broadridge-forefield' : 'publisher-content';

      let mappedDate: string | null = null;
      if (publisher === 'broadridge-forefield') {
        mappedDate = coalesceEffectiveDate({
          effective_date: detailData?.effective_date,
          Effective_date: detailData?.Effective_date,
          data: detailData,
        }, publisher);
      } else {
        mappedDate = coalesceEffectiveDate({
          publish_date: detailData?.publish_date,
          published_date: detailData?.published_date,
          published_at: detailData?.published_at,
          publication_date: detailData?.publication_date,
          data: detailData,
        }, publisher);
      }

      if (mappedDate) detailDateMapped += 1;
      detailPublisherMapped += 1;

      rows.push({
        id: target.id,
        external_id: target.external_id,
        source_system: 'advisorstream',
        publisher,
        published_at: mappedDate,
        metadata: {
          ...((target as any).metadata || {}),
          detailFetched: true,
          detailSource: detailData?.source || null,
          detailMappedDate: mappedDate || null,
        },
      });
    }
  } else {
    return NextResponse.json({ ok: false, error: `Unsupported mode: ${mode}` }, { status: 400 });
  }

  const rowsInDateWindow = rows.filter((row) => {
    if (!row.published_at) return false;
    const iso = new Date(row.published_at).toISOString();
    return iso >= minPublishedAtIso;
  });

  if (dryRun) {
    return NextResponse.json({ ok: true, mode, dryRun: true, wouldProcess: rowsInDateWindow.length, scanned: rows.length });
  }

  const supabase = getSupabaseServerClient();
  let inserted = 0;
  let updated = 0;

  for (const row of rowsInDateWindow) {
    if (mode === 'provider-backfill' && row.id) {
      const { id, ...patch } = row;
      const { error } = await supabase
        .from('source_content')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      updated += 1;
      continue;
    }

    const { data: existing } = await supabase
      .from('source_content')
      .select('id')
      .eq('source_system', row.source_system)
      .eq('external_id', row.external_id)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from('source_content')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      updated += 1;
    } else {
      const { error } = await supabase.from('source_content').insert(row);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      inserted += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    mode,
    runId,
    filters: { forefieldOnly, yearsBack, minPublishedAtIso, maxPages },
    dryRun: false,
    processed: rowsInDateWindow.length,
    skippedOlderOrUndated: Math.max(0, rows.length - rowsInDateWindow.length),
    inserted,
    updated,
    enrichment: mode === 'provider' ? {
      detailFetchSuccess: (typeof detailFetchSuccess !== 'undefined' ? detailFetchSuccess : 0),
      detailFetchMiss: (typeof detailFetchMiss !== 'undefined' ? detailFetchMiss : 0),
      detailDateMapped: (typeof detailDateMapped !== 'undefined' ? detailDateMapped : 0),
      detailPublisherMapped: (typeof detailPublisherMapped !== 'undefined' ? detailPublisherMapped : 0),
    } : undefined,
  });
}
