import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type SyncBlockLog = {
  runId: string;
  mode: string;
  page: number;
  offset: number;
  fetched: number;
  normalized: number;
  publisherMatched: number;
  dateMatched: number;
  inserted: number;
  updated: number;
  skipped: number;
  elapsedMs: number;
  createdAt: string;
};

const LOG_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
const LOG_FILE = path.join(LOG_DIR, 'source-sync-logs.json');

function toDatabaseRow(entry: SyncBlockLog) {
  return {
    run_id: entry.runId,
    mode: entry.mode,
    page: entry.page,
    offset: entry.offset,
    fetched: entry.fetched,
    normalized: entry.normalized,
    publisher_matched: entry.publisherMatched,
    date_matched: entry.dateMatched,
    inserted: entry.inserted,
    updated: entry.updated,
    skipped: entry.skipped,
    elapsed_ms: entry.elapsedMs,
    created_at: entry.createdAt,
  };
}

function fromDatabaseRow(row: Record<string, unknown>): SyncBlockLog {
  return {
    runId: String(row.run_id || ''),
    mode: String(row.mode || ''),
    page: Number(row.page || 0),
    offset: Number(row.offset || 0),
    fetched: Number(row.fetched || 0),
    normalized: Number(row.normalized || 0),
    publisherMatched: Number(row.publisher_matched || 0),
    dateMatched: Number(row.date_matched || 0),
    inserted: Number(row.inserted || 0),
    updated: Number(row.updated || 0),
    skipped: Number(row.skipped || 0),
    elapsedMs: Number(row.elapsed_ms || 0),
    createdAt: String(row.created_at || ''),
  };
}

async function readLocalSyncLogs(): Promise<SyncBlockLog[]> {
  try {
    const raw = await readFile(LOG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function readSyncLogs(): Promise<SyncBlockLog[]> {
  try {
    const { data, error } = await getSupabaseServerClient()
      .from('source_sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (!error && data) return data.map((row) => fromDatabaseRow(row));
  } catch {
    // Local logs keep development usable before the database migration is applied.
  }

  return readLocalSyncLogs();
}

export async function appendSyncLog(entry: SyncBlockLog) {
  await mkdir(LOG_DIR, { recursive: true });
  const logs = await readLocalSyncLogs();
  logs.unshift(entry);
  await writeFile(LOG_FILE, JSON.stringify(logs.slice(0, 2000), null, 2), 'utf8');

  try {
    await getSupabaseServerClient().from('source_sync_logs').insert(toDatabaseRow(entry));
  } catch {
    // The sync itself must remain available if durable log storage is temporarily unavailable.
  }
}
