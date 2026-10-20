import { NextRequest, NextResponse } from 'next/server';
import { POST as runSourceContentSync } from '@/app/api/source-content/sync/route';

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

  const maxItems = positiveInteger(process.env.NIGHTLY_SOURCE_SYNC_MAX_ITEMS, DEFAULT_MAX_ITEMS);
  const maxPages = positiveInteger(process.env.NIGHTLY_SOURCE_SYNC_MAX_PAGES, DEFAULT_MAX_PAGES);

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

  const response = await runSourceContentSync(syncRequest);
  const payload = await response.json().catch(() => ({}));

  return NextResponse.json(
    { ...payload, scheduled: true, limits: { maxItems, maxPages } },
    { status: response.status }
  );
}
