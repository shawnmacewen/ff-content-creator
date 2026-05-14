import { NextResponse } from 'next/server';
import { readSyncLogs } from '@/lib/source-sync-logs';

export async function GET() {
  const logs = await readSyncLogs();
  return NextResponse.json({ ok: true, total: logs.length, logs: logs.slice(0, 500) });
}
