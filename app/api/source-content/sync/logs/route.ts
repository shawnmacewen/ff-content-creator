import { NextRequest, NextResponse } from 'next/server';
import { readSyncLogs } from '@/lib/source-sync-logs';

export async function GET(request: NextRequest) {
  const logs = await readSyncLogs();
  const runId = request.nextUrl.searchParams.get('runId');
  const filtered = runId ? logs.filter((log) => log.runId === runId) : logs;
  const latestSuccessfulSync = filtered.find((log) =>
    log.mode === 'provider' || (log.mode === 'provider-nightly-summary' && log.skipped === 0)
  );

  return NextResponse.json({
    ok: true,
    total: filtered.length,
    lastSyncedAt: latestSuccessfulSync?.createdAt || null,
    logs: filtered.slice(0, 500),
  });
}
