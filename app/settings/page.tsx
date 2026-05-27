'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { BookOpenCheck, Compass, Database, Image, Info, Megaphone, Palette, RefreshCw, Tags } from 'lucide-react';
import { toast } from 'sonner';
import InstagramCarousel2Client from '@/app/instagram-carousel-2/instagram-carousel-2-client';
import ContentApiExplorer from '@/components/settings/content-api-explorer';
import KnowledgeBase from '@/components/settings/knowledge-base';
import ProductUpdates from '@/components/settings/product-updates';
import TagExplorer from '@/components/settings/tag-explorer';
import TemplateDesignSystem from '@/components/settings/template-design-system';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type SettingsTab =
  | 'content-sync'
  | 'content-api-explorer'
  | 'tag-explorer'
  | 'product-updates'
  | 'knowledge-base'
  | 'template-design-system'
  | 'instagram-carousel-2';

const settingsTabs: SettingsTab[] = [
  'content-sync',
  'content-api-explorer',
  'tag-explorer',
  'product-updates',
  'knowledge-base',
  'template-design-system',
  'instagram-carousel-2',
];

const tabMeta: Record<SettingsTab, { label: string; detail: string; icon: typeof Database }> = {
  'content-sync': {
    label: 'Content Sync',
    detail: 'Run provider imports and review sync progress.',
    icon: Database,
  },
  'content-api-explorer': {
    label: 'Content API Explorer',
    detail: 'Inspect provider API responses and query behavior.',
    icon: Compass,
  },
  'tag-explorer': {
    label: 'Tag Explorer',
    detail: 'Audit tag usage, cleanup candidates, and source coverage.',
    icon: Tags,
  },
  'product-updates': {
    label: 'Product Updates',
    detail: 'Review release notes and visual product stories.',
    icon: Megaphone,
  },
  'knowledge-base': {
    label: 'Knowledge Center',
    detail: 'Search help docs for team workflows and app tools.',
    icon: BookOpenCheck,
  },
  'template-design-system': {
    label: 'Template Design System',
    detail: 'Review the shared template patterns, colors, rows, and rails.',
    icon: Palette,
  },
  'instagram-carousel-2': {
    label: 'Instagram Carousel 2.0',
    detail: 'Tune the carousel generation workspace.',
    icon: Image,
  },
};

function getInitialTab(tab: string | null): SettingsTab {
  return settingsTabs.includes(tab as SettingsTab) ? (tab as SettingsTab) : 'content-sync';
}

function getInitialTabFromLocation(): SettingsTab {
  if (typeof window === 'undefined') return 'content-sync';
  return getInitialTab(new URLSearchParams(window.location.search).get('tab'));
}

function TabButton({
  active,
  tab,
  onClick,
}: {
  active: boolean;
  tab: SettingsTab;
  onClick: () => void;
}) {
  const Icon = tabMeta[tab].icon;

  return (
    <button
      className={`flex min-h-[92px] items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
        active
          ? 'border-primary/60 bg-primary/10 text-primary shadow-sm'
          : 'border-border bg-card hover:border-primary/40 hover:bg-accent/40'
      }`}
      onClick={onClick}
      type="button"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold">{tabMeta[tab].label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{tabMeta[tab].detail}</span>
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<SettingsTab>(getInitialTabFromLocation);

  const selectTab = (nextTab: SettingsTab) => {
    setTab(nextTab);
    router.replace(nextTab === 'content-sync' ? '/settings' : `/settings?tab=${nextTab}`, { scroll: false });
  };

  // Content Sync state
  const [running, setRunning] = useState(false);
  const [runningBatched, setRunningBatched] = useState(false);
  const [runningSyncUpdate, setRunningSyncUpdate] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);

  const shouldPollLogs = tab === 'content-sync' && (running || runningBatched || runningSyncUpdate);
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

  const runSyncAndUpdate = async () => {
    setRunningSyncUpdate(true);
    setRunResult(null);
    try {
      const batches: any[] = [];
      let startPage = 0;
      const maxBatches = 20;
      const seenWindows = new Set<string>();

      for (let i = 0; i < maxBatches; i += 1) {
        const response = await fetch('/api/source-content/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'provider-rich-update',
            dryRun: false,
            maxItems: 250,
            maxPages: 1,
            startPage,
          }),
        });

        const json = await response.json();
        batches.push({ batch: i + 1, startPage, ...json });

        if (!response.ok || !json?.ok) break;
        if ((json?.processed ?? 0) === 0) break;

        const windowKey = `${json?.startPage ?? startPage}-${json?.endPage ?? startPage}`;
        if (seenWindows.has(windowKey)) break;
        seenWindows.add(windowKey);

        const nextFromServer = Number(json?.nextStartPage);
        if (!Number.isFinite(nextFromServer) || nextFromServer <= startPage) break;
        startPage = nextFromServer;
      }

      const result = {
        ok: true,
        mode: 'provider-rich-update-batched',
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

      toast.success(
        `Sync and Update complete: ${result.totals.processed} processed (${result.totals.updated} updated) across ${result.batchesRun} batch(es).`
      );
    } catch (error: any) {
      toast.error(error?.message || 'Sync and Update failed');
    } finally {
      setRunningSyncUpdate(false);
    }
  };

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {settingsTabs.map((settingsTab) => (
          <TabButton
            key={settingsTab}
            tab={settingsTab}
            active={tab === settingsTab}
            onClick={() => selectTab(settingsTab)}
          />
        ))}
      </div>

      {tab === 'content-sync' ? (
        <>
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Provider Import</p>
              <h2 className="text-lg font-semibold">Run Content Sync</h2>
              <p className="text-sm text-muted-foreground">Pull Broadridge Advisor Content into the local source library.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={runSync}
                disabled={running || runningBatched || runningSyncUpdate}
                title="This button will sync the first 500 pieces of Broadridge Advisor Content pieces from the Broadridge Content API to seed this database. These 500 pieces are not in a specific order. For more advanced API calls use the Content API Explorer."
              >
                <Database className={`h-4 w-4 mr-2 ${running ? 'animate-pulse' : ''}`} />
                {running ? 'Syncing Broadridge Content API...' : 'Sync Broadridge Content API'}
                <Info className="h-3.5 w-3.5 ml-2 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                onClick={runSyncBatched}
                disabled={running || runningBatched || runningSyncUpdate}
                title="Runs multiple 250-item sync batches in sequence using startPage offsets (target up to ~5000 items). Stops on repeat-page or zero-processed response."
              >
                <Database className={`h-4 w-4 mr-2 ${runningBatched ? 'animate-pulse' : ''}`} />
                {runningBatched ? 'Running Batched Sync...' : 'Sync Broadridge Content API (Batched)'}
              </Button>
              <Button
                variant="outline"
                onClick={runSyncAndUpdate}
                disabled={running || runningBatched || runningSyncUpdate}
                title="Runs a batched update over existing Broadridge source records, fetching article detail data again and saving richer HTML/XML body fields for View Detail rendering."
              >
                <Database className={`h-4 w-4 mr-2 ${runningSyncUpdate ? 'animate-pulse' : ''}`} />
                {runningSyncUpdate ? 'Running Sync and Update...' : 'Sync and Update'}
              </Button>
              <Button variant="secondary" onClick={() => mutate()} disabled={running || runningBatched || runningSyncUpdate}>
                <RefreshCw className="h-4 w-4" />
                Refresh Logs
              </Button>
            </div>
            {runResult ? (
              <pre className="text-xs bg-muted rounded p-2 overflow-auto">{JSON.stringify(runResult, null, 2)}</pre>
            ) : null}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Sync History</p>
              <h2 className="text-lg font-semibold">Content API Logs</h2>
              <p className="text-sm text-muted-foreground">Per-block sync progress auto-refreshes while a sync is running.</p>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-secondary/50 text-left text-muted-foreground">
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
      ) : tab === 'content-api-explorer' ? (
        <ContentApiExplorer />
      ) : tab === 'tag-explorer' ? (
        <TagExplorer />
      ) : tab === 'product-updates' ? (
        <ProductUpdates />
      ) : tab === 'knowledge-base' ? (
        <KnowledgeBase />
      ) : tab === 'template-design-system' ? (
        <TemplateDesignSystem />
      ) : (
        <InstagramCarousel2Client />
      )}
    </div>
  );
}
