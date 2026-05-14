'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SettingsPage() {
  const { data, isLoading } = useSWR('/api/source-content/sync/logs', fetcher, { refreshInterval: 5000 });
  const logs = data?.logs || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Content API logging and diagnostics.</p>
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
