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
import { decodeHtmlEntities, richMarkupToPlainText } from '@/lib/source-content/body';

async function runPostSyncTakeawayBatch(req: Request, shouldRun: boolean) {
  if (!shouldRun) return null;

  try {
    const { POST: runKeyTakeaways } = await import('../key-takeaways/route');
    const response = await runKeyTakeaways(new Request(new URL('/api/source-content/key-takeaways', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize: 25, overwrite: false }),
    }));
    const json = await response.json().catch(() => ({}));
    return {
      ok: response.ok && Boolean(json?.ok),
      scanned: Number(json?.scanned || 0),
      updated: Number(json?.updated || 0),
      skipped: Number(json?.skipped || 0),
      failed: Number(json?.failed || 0),
      hasMore: Boolean(json?.hasMore),
      error: response.ok ? null : (json?.error || `Takeaway enrichment failed (${response.status})`),
    };
  } catch (error: any) {
    return {
      ok: false,
      scanned: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      hasMore: false,
      error: error?.message || 'Post-sync takeaway enrichment failed',
    };
  }
}

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

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function pickExtraProperties(detailData: any) {
  const raw = Array.isArray(detailData?.extra_properties)
    ? detailData.extra_properties
    : Array.isArray(detailData?.extraProps)
      ? detailData.extraProps
      : [];

  const map: Record<string, string> = {};
  for (const item of raw) {
    const key = String(item?.key || '').trim();
    if (!key) continue;
    map[key] = String(item?.stringValue ?? '');
  }

  return {
    raw,
    map,
    selected: {
      BasContentId: map.BasContentId || null,
      BasContentFilename: map.BasContentFilename || null,
      Format: map.Format || null,
      FinraLetterUrl: map.FinraLetterUrl || null,
      FinraApproved: map.FinraApproved || null,
      APContentType: map.APContentType || null,
      Evergreen: map.Evergreen || null,
    },
  };
}

function collectStringValuesByKey(input: any, keyMatcher: (key: string) => boolean) {
  const values: Array<{ key: string; value: string }> = [];
  const seen = new Set<any>();
  const queue: any[] = [input];

  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== 'object' || seen.has(node)) continue;
    seen.add(node);

    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string' && keyMatcher(key) && value.trim()) {
        values.push({ key, value: value.trim() });
      } else if (value && typeof value === 'object') {
        queue.push(value);
      }
    }
  }

  return values;
}

function looksLikeMarkup(input: string) {
  return /<\/?[a-z][\s\S]*>/i.test(decodeHtmlEntities(input));
}

function pickRichBody(detailData: any) {
  const htmlCandidates = collectStringValuesByKey(detailData, (key) => {
    const normalized = key.toLowerCase();
    return (
      normalized.includes('html') ||
      normalized.includes('rendered') ||
      normalized.includes('formatted') ||
      normalized.includes('markup')
    );
  }).filter((candidate) => looksLikeMarkup(candidate.value));

  const xmlCandidates = collectStringValuesByKey(detailData, (key) => {
    const normalized = key.toLowerCase();
    return (
      normalized === 'content' ||
      normalized.includes('xml') ||
      normalized.includes('body') ||
      normalized.includes('articletext') ||
      normalized.includes('fulltext')
    );
  }).filter((candidate) => looksLikeMarkup(candidate.value));

  const bodyXml = xmlCandidates[0]?.value || null;
  const bestPlainSource = bodyXml || htmlCandidates[0]?.value || detailData?.content || '';
  const bodyFormat = bodyXml ? 'xml' : 'plain';

  return {
    bodyXml,
    bodyPlainText: bestPlainSource ? richMarkupToPlainText(String(bestPlainSource)) : '',
    bodyFormat,
    sourceFields: {
      html: htmlCandidates[0]?.key || null,
      xml: xmlCandidates[0]?.key || null,
    },
  };
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
  mode?: 'sample-seed' | 'provider' | 'provider-backfill' | 'provider-rich-update';
  dryRun?: boolean;
  forceDetailDateRefresh?: boolean;
  yearsBack?: number;
  forefieldOnly?: boolean;
  maxPages?: number;
  maxItems?: number;
  startPage?: number;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as SyncRequestBody;
  const mode = body.mode || 'sample-seed';
  const dryRun = !!body.dryRun;
  const forceDetailDateRefresh = !!body.forceDetailDateRefresh;
  const yearsBack = Math.min(10, Math.max(1, Number(body.yearsBack) || 3));
  const forefieldOnly = body.forefieldOnly !== false;
  const maxPages = Math.max(1, Number(body.maxPages) || 250);
  const maxItems = Math.max(1, Number(body.maxItems) || 3000);
  const startPage = Math.max(0, Number(body.startPage) || 0);
  const minPublishedAtIso = new Date(new Date().setUTCFullYear(new Date().getUTCFullYear() - yearsBack)).toISOString();
  const runId = `sync_${Date.now()}`;

  let rows: any[] = [];
  let detailFetchSuccess = 0;
  let detailFetchMiss = 0;
  let detailDateMapped = 0;
  let detailPublisherMapped = 0;
  let repeatingPageDetected = false;
  const repeatingIdsSample: string[] = [];
  const pageDiagnostics: Array<{ page: number; offset: number; firstExternalId: string | null; lastExternalId: string | null; sampleExternalIds: string[] }> = [];

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
      body_text: item.body || item.summary || '',
      body_format: 'plain',
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
      let page = startPage;
      let offset = page * pageSize;
      let totalItems = Number.MAX_SAFE_INTEGER;
      let lastPayload: any = null;
      let previousPageIdsSignature = '';

      const endPageExclusive = startPage + maxPages;
      while (page < endPageExclusive && collected.length < maxItems) {
        const started = Date.now();
        const payload = await searchAdvisorStreamArticles(config, token, {
          limit: pageSize,
          offset,
          pageNumber: page,
          includeSourceFilter: true,
        });
        lastPayload = payload;

        const rawCount =
          (payload as any)?.data?.size ??
          (payload as any)?.data?.records?.length ??
          (payload as any)?.results?.length ??
          (payload as any)?.items?.length ??
          0;

        const pageItems = mapAdvisorStreamSearchResults(payload);
        const pageIds = pageItems.map((i) => String(i.externalId || '')).filter(Boolean);
        pageDiagnostics.push({
          page,
          offset,
          firstExternalId: pageIds[0] || null,
          lastExternalId: pageIds[pageIds.length - 1] || null,
          sampleExternalIds: pageIds.slice(0, 5),
        });
        const pageIdsSignature = pageIds.join('|');
        if (previousPageIdsSignature && pageIdsSignature && previousPageIdsSignature === pageIdsSignature) {
          repeatingPageDetected = true;
          repeatingIdsSample.push(...pageIds.slice(0, 5));
          break;
        }
        previousPageIdsSignature = pageIdsSignature;

        const publisherMatched = pageItems.filter((i) => String(i.publisher || '').toLowerCase() === 'broadridge-forefield').length;
        // Date gating is currently disabled; keep dateMatched aligned with current effective filter stage.
        const dateMatched = publisherMatched;
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

      // Reuse provider-search flow (same structure as existing Provider Sync)
      // and only persist records matching Broadridge Advisor Content.
      const normalized = collected.filter((item) => String(item.publisher || '').toLowerCase() === 'broadridge-forefield');

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
        body_text: item.body,
        body_format: 'plain',
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

      // Detail-first verification pass: only keep rows whose article detail source
      // is exactly "Broadridge Advisor Content".
      const verifiedRows: any[] = [];
      for (const row of rows) {

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
        const richBody = pickRichBody(detailData);

        // Canonical publisher classification from detail source
        const nextPublisher =
          detailSource === 'broadridge advisor content'
            ? 'broadridge-forefield'
            : 'publisher-content';
        if (nextPublisher !== row.publisher) detailPublisherMapped += 1;
        row.publisher = nextPublisher;

        if (nextPublisher !== 'broadridge-forefield') {
          continue;
        }

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

        const extra = pickExtraProperties(detailData);
        const categories = Array.isArray(detailData?.categories) ? detailData.categories : [];
        const subCategories = Array.isArray(detailData?.sub_categories)
          ? detailData.sub_categories
          : Array.isArray(detailData?.subCategories)
            ? detailData.subCategories
            : [];
        row.content_designation = detailData?.content_designation || null;
        row.categories = categories;
        row.sub_categories = subCategories;
        row.bas_content_id = extra.selected.BasContentId;
        row.bas_content_filename = extra.selected.BasContentFilename;
        row.content_format = extra.selected.Format;
        row.finra_letter_url = extra.selected.FinraLetterUrl;
        row.finra_approved = extra.selected.FinraApproved === null ? null : String(extra.selected.FinraApproved).toLowerCase() === 'true';
        row.ap_content_type = extra.selected.APContentType;
        row.evergreen = extra.selected.Evergreen === null ? null : String(extra.selected.Evergreen).toLowerCase() === 'true';
        if (richBody.bodyPlainText) row.body = richBody.bodyPlainText;
        row.body_text = richBody.bodyPlainText || row.body || '';
        row.body_format = richBody.bodyFormat;
        row.body_xml = richBody.bodyXml;

        row.metadata = {
          ...(row.metadata || {}),
          detailFetched: true,
          detailSource: detailData?.source || null,
          detailMappedDate: row.published_at || null,
          extraPropertiesRaw: extra.raw,
          extraProperties: extra.map,
          extraPropertiesSelected: extra.selected,
          categories,
          subCategories,
          contentDesignation: detailData?.content_designation || null,
          richBodySourceFields: richBody.sourceFields,
        };

        verifiedRows.push(row);
      }

      rows = verifiedRows;
    } catch (error: any) {
      return NextResponse.json(
        { ok: false, error: error?.message || 'Provider sync failed' },
        { status: 502 }
      );
    }
  } else if (mode === 'provider-rich-update') {
    const config = getAdvisorStreamConfig();
    if (!validateAdvisorStreamConfig(config)) {
      return NextResponse.json(
        { ok: false, error: 'AdvisorStream env vars are not fully configured' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const pageSize = Math.max(1, Math.min(500, maxItems));
    const from = startPage * pageSize;
    const to = from + pageSize - 1;

    let targetQuery = supabase
      .from('source_content')
      .select('id, external_id, source_system, publisher, published_at, metadata, body, body_text')
      .eq('source_system', 'advisorstream')
      .order('created_at', { ascending: true })
      .range(from, to);

    if (forefieldOnly) targetQuery = targetQuery.eq('publisher', 'broadridge-forefield');

    const { data: richUpdateRows, error: richUpdateError } = await targetQuery;

    if (richUpdateError) {
      return NextResponse.json({ ok: false, error: richUpdateError.message }, { status: 500 });
    }

    const token = await getAdvisorStreamAccessToken(config);
    const targets = richUpdateRows || [];

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
      const richBody = pickRichBody(detailData);

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

      const extra = pickExtraProperties(detailData);
      const categories = Array.isArray(detailData?.categories) ? detailData.categories : [];
      const subCategories = Array.isArray(detailData?.sub_categories)
        ? detailData.sub_categories
        : Array.isArray(detailData?.subCategories)
          ? detailData.subCategories
          : [];

      rows.push({
        id: target.id,
        external_id: target.external_id,
        source_system: 'advisorstream',
        publisher,
        body: richBody.bodyPlainText || target.body_text || target.body || '',
        body_text: richBody.bodyPlainText || target.body_text || target.body || '',
        body_format: richBody.bodyFormat,
        body_xml: richBody.bodyXml,
        published_at: mappedDate || target.published_at || null,
        content_designation: detailData?.content_designation || null,
        categories,
        sub_categories: subCategories,
        bas_content_id: extra.selected.BasContentId,
        bas_content_filename: extra.selected.BasContentFilename,
        content_format: extra.selected.Format,
        finra_letter_url: extra.selected.FinraLetterUrl,
        finra_approved: extra.selected.FinraApproved === null ? null : String(extra.selected.FinraApproved).toLowerCase() === 'true',
        ap_content_type: extra.selected.APContentType,
        evergreen: extra.selected.Evergreen === null ? null : String(extra.selected.Evergreen).toLowerCase() === 'true',
        metadata: {
          ...((target as any).metadata || {}),
          detailFetched: true,
          detailSource: detailData?.source || null,
          detailMappedDate: mappedDate || target.published_at || null,
          extraPropertiesRaw: extra.raw,
          extraProperties: extra.map,
          extraPropertiesSelected: extra.selected,
          categories,
          subCategories,
          contentDesignation: detailData?.content_designation || null,
          richBodySourceFields: richBody.sourceFields,
          richBodyUpdatedAt: new Date().toISOString(),
        },
      });
    }

    await appendSyncLog({
      runId,
      mode,
      page: startPage,
      offset: from,
      fetched: targets.length,
      normalized: rows.length,
      publisherMatched: rows.filter((row) => row.publisher === 'broadridge-forefield').length,
      dateMatched: rows.filter((row) => row.published_at).length,
      inserted: 0,
      updated: rows.length,
      skipped: Math.max(0, targets.length - rows.length),
      elapsedMs: 0,
      createdAt: new Date().toISOString(),
    });

    pageDiagnostics.push({
      page: startPage,
      offset: from,
      firstExternalId: String(targets[0]?.external_id || '') || null,
      lastExternalId: String(targets[targets.length - 1]?.external_id || '') || null,
      sampleExternalIds: targets.slice(0, 5).map((target: any) => String(target.external_id || '')).filter(Boolean),
    });
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
      const richBody = pickRichBody(detailData);

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

      const extra = pickExtraProperties(detailData);
      const categories = Array.isArray(detailData?.categories) ? detailData.categories : [];
      const subCategories = Array.isArray(detailData?.sub_categories)
        ? detailData.sub_categories
        : Array.isArray(detailData?.subCategories)
          ? detailData.subCategories
          : [];

      rows.push({
        id: target.id,
        external_id: target.external_id,
        source_system: 'advisorstream',
        publisher,
        ...(richBody.bodyPlainText ? { body: richBody.bodyPlainText, body_text: richBody.bodyPlainText } : {}),
        body_format: richBody.bodyFormat,
        body_xml: richBody.bodyXml,
        published_at: mappedDate,
        content_designation: detailData?.content_designation || null,
        categories,
        sub_categories: subCategories,
        bas_content_id: extra.selected.BasContentId,
        bas_content_filename: extra.selected.BasContentFilename,
        content_format: extra.selected.Format,
        finra_letter_url: extra.selected.FinraLetterUrl,
        finra_approved: extra.selected.FinraApproved === null ? null : String(extra.selected.FinraApproved).toLowerCase() === 'true',
        ap_content_type: extra.selected.APContentType,
        evergreen: extra.selected.Evergreen === null ? null : String(extra.selected.Evergreen).toLowerCase() === 'true',
        metadata: {
          ...((target as any).metadata || {}),
          detailFetched: true,
          detailSource: detailData?.source || null,
          detailMappedDate: mappedDate || null,
          extraPropertiesRaw: extra.raw,
          extraProperties: extra.map,
          extraPropertiesSelected: extra.selected,
          categories,
          subCategories,
          contentDesignation: detailData?.content_designation || null,
          richBodySourceFields: richBody.sourceFields,
          richBodyUpdatedAt: new Date().toISOString(),
        },
      });
    }
  } else {
    return NextResponse.json({ ok: false, error: `Unsupported mode: ${mode}` }, { status: 400 });
  }

  const rowsAfterPublisher = rows.filter((row) => !forefieldOnly || String(row.publisher || '').toLowerCase() === 'broadridge-forefield');
  const rowsAfterFilters = rowsAfterPublisher;

  const dedupedByExternal = new Map<string, any>();
  let duplicateExternalIdsSkipped = 0;
  for (const row of rowsAfterFilters) {
    const key = `${row.source_system || 'advisorstream'}::${row.external_id || ''}`;
    if (!row.external_id) continue;
    if (dedupedByExternal.has(key)) duplicateExternalIdsSkipped += 1;
    dedupedByExternal.set(key, row);
  }
  const uniqueRows = Array.from(dedupedByExternal.values());

  if (dryRun) {
    return NextResponse.json({ ok: true, mode, dryRun: true, wouldProcess: uniqueRows.length, scanned: rows.length, publisherMatched: rowsAfterPublisher.length, dateMatched: rowsAfterFilters.length, duplicateExternalIdsSkipped, uniqueExternalIdsSeen: uniqueRows.length, repeatingPageDetected, repeatingIdsSample: Array.from(new Set(repeatingIdsSample)).slice(0, 10), startPage, endPage: Math.max(startPage, startPage + pageDiagnostics.length - 1), nextStartPage: startPage + pageDiagnostics.length, pageDiagnostics: pageDiagnostics.slice(0, 20) });
  }

  const supabase = getSupabaseServerClient();
  let inserted = 0;
  let updated = 0;

  let newExternalIdsDiscovered = 0;
  if (mode === 'provider') {
    const uniqueExternalIds = uniqueRows.map((r: any) => r.external_id).filter(Boolean);
    if (uniqueExternalIds.length) {
      const { data: existingRows } = await supabase
        .from('source_content')
        .select('external_id')
        .eq('source_system', 'advisorstream')
        .in('external_id', uniqueExternalIds as string[]);
      const existingSet = new Set((existingRows || []).map((r: any) => r.external_id));
      newExternalIdsDiscovered = uniqueExternalIds.filter((id: string) => !existingSet.has(id)).length;
    }
  }

  for (const row of uniqueRows) {
    if ((mode === 'provider-backfill' || mode === 'provider-rich-update') && row.id) {
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

  const postSyncTakeaways = await runPostSyncTakeawayBatch(req, mode === 'provider' || mode === 'provider-rich-update');

  return NextResponse.json({
    ok: true,
    mode,
    runId,
    filters: { forefieldOnly, yearsBack: null, minPublishedAtIso: null, maxPages, maxItems, startPage },
    dryRun: false,
    processed: uniqueRows.length,
    scannedTotal: rows.length,
    publisherMatchedTotal: rowsAfterPublisher.length,
    dateMatchedTotal: rowsAfterFilters.length,
    uniqueExternalIdsSeen: uniqueRows.length,
    duplicateExternalIdsSkipped,
    skippedOlderOrUndated: Math.max(0, rows.length - rowsAfterFilters.length),
    inserted,
    updated,
    newExternalIdsDiscovered,
    startPage,
    endPage: Math.max(startPage, startPage + pageDiagnostics.length - 1),
    nextStartPage: startPage + pageDiagnostics.length,
    repeatingPageDetected,
    repeatingIdsSample: Array.from(new Set(repeatingIdsSample)).slice(0, 10),
    pageDiagnostics: pageDiagnostics.slice(0, 20),
    enrichment: (mode === 'provider' || mode === 'provider-rich-update') ? {
      detailFetchSuccess: (typeof detailFetchSuccess !== 'undefined' ? detailFetchSuccess : 0),
      detailFetchMiss: (typeof detailFetchMiss !== 'undefined' ? detailFetchMiss : 0),
      detailDateMapped: (typeof detailDateMapped !== 'undefined' ? detailDateMapped : 0),
      detailPublisherMapped: (typeof detailPublisherMapped !== 'undefined' ? detailPublisherMapped : 0),
      postSyncTakeaways,
    } : undefined,
  });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Source content sync failed',
        stage: 'sync-route',
      },
      { status: 500 }
    );
  }
}
