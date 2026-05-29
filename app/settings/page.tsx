'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { BookOpenCheck, Building2, Compass, Database, Flag, Image, Info, Megaphone, Palette, RefreshCw, Tags } from 'lucide-react';
import { toast } from 'sonner';
import InstagramCarousel2Client from '@/app/instagram-carousel-2/instagram-carousel-2-client';
import ContentApiExplorer from '@/components/settings/content-api-explorer';
import KnowledgeBase from '@/components/settings/knowledge-base';
import ProductUpdates from '@/components/settings/product-updates';
import RoadmapIdeas from '@/components/settings/roadmap-ideas';
import TagExplorer from '@/components/settings/tag-explorer';
import TemplateDesignSystem from '@/components/settings/template-design-system';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type SettingsTab =
  | 'custom-profile'
  | 'content-sync'
  | 'content-api-explorer'
  | 'tag-explorer'
  | 'product-updates'
  | 'roadmap-ideas'
  | 'knowledge-base'
  | 'template-design-system'
  | 'instagram-carousel-2';

const settingsTabs: SettingsTab[] = [
  'custom-profile',
  'content-sync',
  'content-api-explorer',
  'tag-explorer',
  'product-updates',
  'roadmap-ideas',
  'knowledge-base',
  'template-design-system',
  'instagram-carousel-2',
];

const tabMeta: Record<SettingsTab, { label: string; detail: string; icon: typeof Database }> = {
  'custom-profile': {
    label: 'Custom Profile',
    detail: 'Prepare brand, platform, and company profile controls.',
    icon: Building2,
  },
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
  'roadmap-ideas': {
    label: 'Roadmap Ideas',
    detail: 'Collect upcoming product ideas and compare planning views.',
    icon: Flag,
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
      className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
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
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-5">{tabMeta[tab].label}</span>
      </span>
    </button>
  );
}

function CustomProfileSettings() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Platform Identity</p>
          <h2 className="text-lg font-semibold">Custom Profile</h2>
          <p className="text-sm text-muted-foreground">
            Placeholder settings for future platform labels, company profile details, and reusable brand assets.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Workspace label</label>
            <Input value="EDITOR[AI]L" readOnly />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Company profile</label>
            <Input value="Advisor content team" readOnly />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Primary color</label>
            <Input value="#143a7b" readOnly />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Accent color</label>
            <Input value="#0f6f8f" readOnly />
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase text-primary">Coming next</p>
        <h2 className="mt-1 text-lg font-semibold">Generation profile inputs</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This area will hold logo, colors, white-label platform naming, and company voice examples that can be reused by generation tools.
        </p>
      </div>
    </div>
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
  const [refreshingStats, setRefreshingStats] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);

  const shouldPollLogs = tab === 'content-sync' && (running || runningBatched || runningSyncUpdate);
  const { data, isLoading, mutate } = useSWR('/api/source-content/sync/logs', fetcher, {
    refreshInterval: shouldPollLogs ? 5000 : 0,
  });
  const logs = data?.logs || [];

  const refreshSourceStatsCache = async () => {
    const response = await fetch('/api/source-content/stats', { method: 'POST' });
    const json = await response.json();
    if (!response.ok || !json?.ok) {
      throw new Error(json?.error || 'Source stats refresh failed');
    }
    return json;
  };

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
      const statsRefresh = response.ok && json?.ok ? await refreshSourceStatsCache() : null;
      setRunResult({ ...json, statsRefresh });
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

      const statsRefresh = await refreshSourceStatsCache();
      setRunResult({ ...result, statsRefresh });
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
        `Batched sync complete: ${result.totals.processed} processed (${result.totals.inserted} inserted, ${result.totals.updated} updated) across ${result.batchesRun} batch(es)${finalBroadridgeCount !== null ? `. Final Broadridge count: ${finalBroadridgeCount}.` : ''} Source stats refreshed.`
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

      const statsRefresh = await refreshSourceStatsCache();
      setRunResult({ ...result, statsRefresh });
      mutate();

      toast.success(
        `Sync and Update complete: ${result.totals.processed} processed (${result.totals.updated} updated) across ${result.batchesRun} batch(es). Source stats refreshed.`
      );
    } catch (error: any) {
      toast.error(error?.message || 'Sync and Update failed');
    } finally {
      setRunningSyncUpdate(false);
    }
  };

  const refreshSourceStats = async () => {
    setRefreshingStats(true);
    setRunResult(null);
    try {
      const json = await refreshSourceStatsCache();
      setRunResult(json);
      toast.success(`Source stats refreshed from ${Number(json.scannedRows || 0).toLocaleString()} rows.`);
    } catch (error: any) {
      toast.error(error?.message || 'Source stats refresh failed');
    } finally {
      setRefreshingStats(false);
    }
  };

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <PageHeader
        eyebrow="Workspace controls"
        title="Settings"
        description="Manage source sync, app help, carousel tuning, and workspace profile controls."
        metrics={[
          {
            label: tabMeta[tab].label,
            detail: tabMeta[tab].detail,
            icon: tabMeta[tab].icon,
          },
        ]}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {settingsTabs.map((settingsTab) => (
          <TabButton
            key={settingsTab}
            tab={settingsTab}
            active={tab === settingsTab}
            onClick={() => selectTab(settingsTab)}
          />
        ))}
      </div>

      {tab === 'custom-profile' ? (
        <CustomProfileSettings />
      ) : tab === 'content-sync' ? (
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

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Cached Source Stats</p>
              <h2 className="text-lg font-semibold">Refresh Source Filters and Summary</h2>
              <p className="text-sm text-muted-foreground">
                Rebuild cached filter options and Source Content summary numbers on demand. Normal page loads read the cache instead of scanning source rows.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={refreshSourceStats}
              disabled={running || runningBatched || runningSyncUpdate || refreshingStats}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshingStats ? 'animate-spin' : ''}`} />
              {refreshingStats ? 'Refreshing Source Stats...' : 'Refresh Source Stats'}
            </Button>
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
      ) : tab === 'roadmap-ideas' ? (
        <RoadmapIdeas />
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
