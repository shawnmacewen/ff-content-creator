import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

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

const LOG_DIR = path.join(process.cwd(), 'data');
const LOG_FILE = path.join(LOG_DIR, 'source-sync-logs.json');

export async function readSyncLogs(): Promise<SyncBlockLog[]> {
  try {
    const raw = await readFile(LOG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendSyncLog(entry: SyncBlockLog) {
  await mkdir(LOG_DIR, { recursive: true });
  const logs = await readSyncLogs();
  logs.unshift(entry);
  await writeFile(LOG_FILE, JSON.stringify(logs.slice(0, 2000), null, 2), 'utf8');
}
