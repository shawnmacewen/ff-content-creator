import { NextRequest, NextResponse } from 'next/server';
import { readSyncLogs } from '@/lib/source-sync-logs';

export async function GET(request: NextRequest) {
  const logs = await readSyncLogs();
  const runId = request.nextUrl.searchParams.get('runId');
  const filtered = runId ? logs.filter((l) => l.runId === runId) : logs;
  return NextResponse.json({ ok: true, total: filtered.length, logs: filtered.slice(0, 500) });
}
