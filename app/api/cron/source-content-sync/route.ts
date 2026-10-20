import { NextRequest, NextResponse } from 'next/server';
import { POST as runSourceContentSync } from '@/app/api/source-content/sync/route';
import { appendSyncLog } from '@/lib/source-sync-logs';

export const runtime = 'nodejs';
export const maxDuration = 300;

const DEFAULT_MAX_ITEMS = 250;
const DEFAULT_MAX_PAGES = 10;

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  return request.headers.get('authorization') === `Bearer ${secret}`;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const maxItems = positiveInteger(process.env.NIGHTLY_SOURCE_SYNC_MAX_ITEMS, DEFAULT_MAX_ITEMS);
  const maxPages = positiveInteger(process.env.NIGHTLY_SOURCE_SYNC_MAX_PAGES, DEFAULT_MAX_PAGES);
  const scheduledRunId = `nightly_sync_${startedAt}`;

  const syncRequest = new Request(new URL('/api/source-content/sync', request.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'provider',
      dryRun: false,
      maxItems,
      maxPages,
      startPage: 0,
    }),
  });

  let response: Response;
  try {
    response = await runSourceContentSync(syncRequest);
  } catch (error: any) {
    await appendSyncLog({
      runId: scheduledRunId,
      mode: 'provider-nightly-summary',
      page: -1,
      offset: 0,
      fetched: 0,
      normalized: 0,
      publisherMatched: 0,
      dateMatched: 0,
      inserted: 0,
      updated: 0,
      skipped: 1,
      elapsedMs: Date.now() - startedAt,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: false, error: error?.message || 'Nightly source sync failed', scheduled: true }, { status: 500 });
  }

  const payload = await response.json().catch(() => ({}));
  await appendSyncLog({
    runId: String(payload?.runId || scheduledRunId),
    mode: 'provider-nightly-summary',
    page: -1,
    offset: 0,
    fetched: Number(payload?.scannedTotal || 0),
    normalized: Number(payload?.processed || 0),
    publisherMatched: Number(payload?.publisherMatchedTotal || 0),
    dateMatched: Number(payload?.dateMatchedTotal || 0),
    inserted: Number(payload?.inserted || 0),
    updated: Number(payload?.updated || 0),
    skipped: response.ok && payload?.ok ? 0 : 1,
    elapsedMs: Date.now() - startedAt,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json(
    { ...payload, scheduled: true, limits: { maxItems, maxPages } },
    { status: response.status }
  );
}
