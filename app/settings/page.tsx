'use client';

import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SettingsPage() {
  const { data, isLoading, mutate } = useSWR('/api/source-content/sync/logs', fetcher, { refreshInterval: 5000 });
  const logs = data?.logs || [];

  const [yearsBack, setYearsBack] = useState(3);
  const [maxPages, setMaxPages] = useState(250);
  const [forefieldOnly, setForefieldOnly] = useState(true);
  const [dryRun, setDryRun] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);

  const runSync = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const response = await fetch('/api/source-content/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'provider',
          yearsBack,
          maxPages,
          forefieldOnly,
          dryRun,
        }),
      });
      const json = await response.json();
      setRunResult(json);
      mutate();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Content API logging and diagnostics.</p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Run Content Sync</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">Years Back
            <input className="mt-1 w-full rounded border bg-background px-2 py-1" type="number" min={1} max={10} value={yearsBack} onChange={(e) => setYearsBack(Number(e.target.value) || 3)} />
          </label>
          <label className="text-sm">Max Pages
            <input className="mt-1 w-full rounded border bg-background px-2 py-1" type="number" min={1} max={1000} value={maxPages} onChange={(e) => setMaxPages(Number(e.target.value) || 250)} />
          </label>
          <label className="text-sm flex items-end gap-2">
            <input type="checkbox" checked={forefieldOnly} onChange={(e) => setForefieldOnly(e.target.checked)} /> Forefield only
          </label>
          <label className="text-sm flex items-end gap-2">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} /> Dry run
          </label>
        </div>
        <div className="flex gap-2">
          <button className="rounded bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50" onClick={runSync} disabled={running}>
            {running ? 'Running...' : 'Run Sync'}
          </button>
          <button className="rounded border px-4 py-2 text-sm" onClick={() => mutate()} disabled={running}>Refresh Logs</button>
        </div>
        {runResult ? (
          <pre className="text-xs bg-muted rounded p-2 overflow-auto">{JSON.stringify(runResult, null, 2)}</pre>
        ) : null}
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Content API Logs</h2>
        <p className="text-sm text-muted-foreground">Per-block sync progress (auto-refresh every 5s).</p>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Time</th>
                <th className="p-2">Run</th>
                <th className="p-2">Page</th>
                <th className="p-2">Fetched</th>
                <th className="p-2">Publisher Match</th>
                <th className="p-2">Date Match</th>
                <th className="p-2">Elapsed</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="p-2" colSpan={7}>Loading...</td></tr>
              ) : logs.length ? logs.map((log: any, i: number) => (
                <tr key={`${log.runId}-${log.page}-${i}`} className="border-b">
                  <td className="p-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="p-2 font-mono text-xs">{log.runId}</td>
                  <td className="p-2">{log.page}</td>
                  <td className="p-2">{log.fetched}</td>
                  <td className="p-2">{log.publisherMatched}</td>
                  <td className="p-2">{log.dateMatched}</td>
                  <td className="p-2">{log.elapsedMs}ms</td>
                </tr>
              )) : (
                <tr><td className="p-2" colSpan={7}>No logs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
