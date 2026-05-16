'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Database, Info } from 'lucide-react';
import { toast } from 'sonner';
import ContentApiExplorer from '@/components/settings/content-api-explorer';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type SettingsTab = 'content-sync' | 'content-api-explorer';

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`px-3 py-2 text-sm rounded-md border ${active ? 'bg-muted' : 'bg-background hover:bg-muted/50'}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('content-sync');

  // Content Sync state
  const [running, setRunning] = useState(false);
  const [runningBatched, setRunningBatched] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);

  const shouldPollLogs = tab === 'content-sync' && (running || runningBatched);
  const { data, isLoading, mutate } = useSWR('/api/source-content/sync/logs', fetcher, {
    refreshInterval: shouldPollLogs ? 5000 : 0,
  });
  const logs = data?.logs || [];

  const runSync = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const response = await fetch('/api/source-content/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'provider',
          dryRun: false,
          maxItems: 500,
          maxPages: 20,
        }),
      });
      const json = await response.json();
      setRunResult(json);
      mutate();
    } finally {
      setRunning(false);
    }
  };

  const runSyncBatched = async () => {
    setRunningBatched(true);
    setRunResult(null);
    try {
      const batches: any[] = [];
      let startPage = 0;
      const maxBatches = 20; // target up to ~5000 items at 250 per batch
      const seenWindows = new Set<string>();

      for (let i = 0; i < maxBatches; i += 1) {
        const response = await fetch('/api/source-content/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'provider',
            dryRun: false,
            maxItems: 250,
            maxPages: 10,
            startPage,
          }),
        });

        const json = await response.json();
        batches.push({ batch: i + 1, startPage, ...json });

        if (!response.ok || !json?.ok) break;
        if (json?.repeatingPageDetected) break;
        if ((json?.processed ?? 0) === 0) break;

        const windowKey = `${json?.startPage ?? startPage}-${json?.endPage ?? startPage}`;
        if (seenWindows.has(windowKey)) break;
        seenWindows.add(windowKey);

        const nextFromServer = Number(json?.nextStartPage);
        const endPage = Number(json?.endPage);
        const computedNext = Number.isFinite(endPage) ? endPage + 1 : NaN;
        const nextStartPage = Number.isFinite(nextFromServer) && nextFromServer > startPage ? nextFromServer : computedNext;
        if (!Number.isFinite(nextStartPage) || nextStartPage <= startPage) break;
        startPage = nextStartPage;
      }

      const result = {
        ok: true,
        mode: 'provider-batched',
        batchesRun: batches.length,
        totals: {
          processed: batches.reduce((n, b) => n + (b.processed || 0), 0),
          inserted: batches.reduce((n, b) => n + (b.inserted || 0), 0),
          updated: batches.reduce((n, b) => n + (b.updated || 0), 0),
        },
        batches,
      };

      setRunResult(result);
      mutate();

      let finalBroadridgeCount: number | null = null;
      try {
        const countResp = await fetch('/api/source-content?page=1&pageSize=1&publisher=broadridge-forefield');
        const countJson = await countResp.json();
        finalBroadridgeCount = Number(countJson?.total ?? 0);
      } catch {
        finalBroadridgeCount = null;
      }

      toast.success(
        `Batched sync complete: ${result.totals.processed} processed (${result.totals.inserted} inserted, ${result.totals.updated} updated) across ${result.batchesRun} batch(es)${finalBroadridgeCount !== null ? `. Final Broadridge count: ${finalBroadridgeCount}.` : ''}`
      );
    } catch (error: any) {
      toast.error(error?.message || 'Batched sync failed');
    } finally {
      setRunningBatched(false);
    }
  };

  const header = useMemo(() => {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Content Sync + Content API Explorer.</p>
      </div>
    );
  }, []);

  return (
    <div className="space-y-6">
      {header}

      <div className="flex items-center gap-2">
        <TabButton active={tab === 'content-sync'} onClick={() => setTab('content-sync')}>
          Content Sync
        </TabButton>
        <TabButton active={tab === 'content-api-explorer'} onClick={() => setTab('content-api-explorer')}>
          Content API Explorer
        </TabButton>
      </div>

      {tab === 'content-sync' ? (
        <>
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-lg font-semibold">Run Content Sync</h2>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center rounded border px-4 py-2 text-sm disabled:opacity-50"
                onClick={runSync}
                disabled={running || runningBatched}
                title="This button will sync the first 500 pieces of Broadridge Advisor Content pieces from the Broadridge Content API to seed this database. These 500 pieces are not in a specific order. For more advanced API calls use the Content API Explorer."
              >
                <Database className={`h-4 w-4 mr-2 ${running ? 'animate-pulse' : ''}`} />
                {running ? 'Syncing Broadridge Content API...' : 'Sync Broadridge Content API'}
                <Info className="h-3.5 w-3.5 ml-2 text-muted-foreground" />
              </button>
              <button
                className="inline-flex items-center rounded border px-4 py-2 text-sm disabled:opacity-50"
                onClick={runSyncBatched}
                disabled={running || runningBatched}
                title="Runs multiple 250-item sync batches in sequence using startPage offsets (target up to ~5000 items). Stops on repeat-page or zero-processed response."
              >
                <Database className={`h-4 w-4 mr-2 ${runningBatched ? 'animate-pulse' : ''}`} />
                {runningBatched ? 'Running Batched Sync...' : 'Sync Broadridge Content API (Batched)'}
              </button>
              <button className="rounded border px-4 py-2 text-sm" onClick={() => mutate()} disabled={running || runningBatched}>
                Refresh Logs
              </button>
            </div>
            {runResult ? (
              <pre className="text-xs bg-muted rounded p-2 overflow-auto">{JSON.stringify(runResult, null, 2)}</pre>
            ) : null}
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-lg font-semibold">Content API Logs</h2>
            <p className="text-sm text-muted-foreground">Per-block sync progress (auto-refresh every 5s while a sync is running).</p>
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
                    <tr>
                      <td className="p-2" colSpan={7}>
                        Loading...
                      </td>
                    </tr>
                  ) : logs.length ? (
                    logs.map((log: any, i: number) => (
                      <tr key={`${log.runId}-${log.page}-${i}`} className="border-b">
                        <td className="p-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="p-2 font-mono text-xs">{log.runId}</td>
                        <td className="p-2">{log.page}</td>
                        <td className="p-2">{log.fetched}</td>
                        <td className="p-2">{log.publisherMatched}</td>
                        <td className="p-2">{log.dateMatched}</td>
                        <td className="p-2">{log.elapsedMs}ms</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-2" colSpan={7}>
                        No logs yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <ContentApiExplorer />
      )}
    </div>
  );
}
