'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ContentCard } from '@/components/source-content/content-card';
import { ContentFilters } from '@/components/source-content/content-filters';
import { ContentDetail } from '@/components/source-content/content-detail';
import type { SourceContent } from '@/lib/types/content';
import { Database, FolderOpen, Loader2, Sparkles } from 'lucide-react';
import useSWR from 'swr';
import { PageHeader } from '@/components/layout/page-header';
import { toast } from 'sonner';

interface ApiResponse {
  data: SourceContent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage?: boolean;
  filters: {
    availableTags: string[];
    availableTypes: string[];
    availableAuthors: string[];
    availablePublishers: string[];
  };
  meta?: {
    lastSyncedAt?: string | null;
    sourceCounts?: Record<string, number>;
    publisherCounts?: Record<string, number>;
    finraReviewedCount?: number;
    totalSourceContent?: number;
  };
}

interface FilterResponse {
  availableTags: string[];
  availableTypes: string[];
  availableAuthors: string[];
  availablePublishers: string[];
}

type SyncProgress = {
  currentBatch: number;
  maxBatches: number;
  processed: number;
  inserted: number;
  updated: number;
};

const emptyFilters: FilterResponse = {
  availableTags: [],
  availableTypes: [],
  availableAuthors: [],
  availablePublishers: [],
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || `Request failed with status ${response.status}`);
  }

  return body;
};

function getInitialSourceFilters() {
  if (typeof window === 'undefined') {
    return { q: '', searchScope: 'all', contentDesignation: '', tags: '', publisher: '' };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get('q') || '',
    searchScope: params.get('searchScope') || 'all',
    contentDesignation: params.get('contentDesignation') || params.get('type') || '',
    tags: params.get('tags') || '',
    publisher: params.get('publisher') || '',
  };
}

export default function SourceContentPage() {
  const router = useRouter();
  const [initialFilters] = useState(getInitialSourceFilters);
  const [searchQuery, setSearchQuery] = useState(initialFilters.q);
  const [searchScope, setSearchScope] = useState(initialFilters.searchScope);
  const [selectedType, setSelectedType] = useState(initialFilters.contentDesignation);
  const [selectedTag, setSelectedTag] = useState(initialFilters.tags);
  const [selectedPublisher, setSelectedPublisher] = useState(initialFilters.publisher);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailContent, setDetailContent] = useState<SourceContent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(initialFilters.q);
  const [page, setPage] = useState(1);
  const [runningSourceSync, setRunningSourceSync] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build API URL with filters
  const apiUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (searchScope && searchScope !== 'all') params.set('searchScope', searchScope);
    if (selectedType && selectedType !== 'all') params.set('contentDesignation', selectedType);
    if (selectedTag && selectedTag !== 'all') params.set('tags', selectedTag);
    if (selectedPublisher && selectedPublisher !== 'all') params.set('publisher', selectedPublisher);
    params.set('page', String(page));
    params.set('pageSize', '20');
    return `/api/source-content?${params.toString()}`;
  }, [debouncedQuery, searchScope, selectedType, selectedTag, selectedPublisher, page]);

  const { data, error, isLoading, mutate: mutateSourceContent } = useSWR<ApiResponse>(apiUrl(), fetcher, {
    keepPreviousData: true,
    shouldRetryOnError: false,
  });
  const { data: filterData } = useSWR<FilterResponse>('/api/source-content/filters', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const contentItems = Array.isArray(data?.data) ? data.data : [];
  const filters = filterData || data?.filters || emptyFilters;
  const totalAvailableItems = data?.meta?.totalSourceContent || data?.total || 0;
  const syncProgressPercent = syncProgress
    ? Math.max(4, Math.min(100, Math.round((syncProgress.currentBatch / syncProgress.maxBatches) * 100)))
    : 0;

  const refreshSourceStatsCache = async () => {
    const response = await fetch('/api/source-content/stats', { method: 'POST' });
    const json = await response.json();
    if (!response.ok || !json?.ok) {
      throw new Error(json?.error || 'Source stats refresh failed');
    }
    return json;
  };

  const runBroadridgeContentSync = async () => {
    setRunningSourceSync(true);
    setSyncProgress({ currentBatch: 0, maxBatches: 20, processed: 0, inserted: 0, updated: 0 });

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
            mode: 'provider',
            dryRun: false,
            maxItems: 250,
            maxPages: 10,
            startPage,
          }),
        });

        const json = await response.json();
        batches.push({ batch: i + 1, startPage, ...json });

        const processed = batches.reduce((n, b) => n + (b.processed || 0), 0);
        const inserted = batches.reduce((n, b) => n + (b.inserted || 0), 0);
        const updated = batches.reduce((n, b) => n + (b.updated || 0), 0);
        setSyncProgress({ currentBatch: i + 1, maxBatches, processed, inserted, updated });

        if (!response.ok || !json?.ok) {
          throw new Error(json?.error || 'Broadridge content sync failed');
        }
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
        batchesRun: batches.length,
        totals: {
          processed: batches.reduce((n, b) => n + (b.processed || 0), 0),
          inserted: batches.reduce((n, b) => n + (b.inserted || 0), 0),
          updated: batches.reduce((n, b) => n + (b.updated || 0), 0),
        },
      };

      await refreshSourceStatsCache();
      await mutateSourceContent();

      toast.success(
        `Broadridge content sync complete: ${result.totals.processed} processed (${result.totals.inserted} inserted, ${result.totals.updated} updated) across ${result.batchesRun} batch(es).`
      );
    } catch (error: any) {
      toast.error(error?.message || 'Broadridge content sync failed');
    } finally {
      setRunningSourceSync(false);
      setSyncProgress(null);
    }
  };

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleViewDetail = async (content: SourceContent) => {
    setDetailContent(content);
    setDetailOpen(true);

    try {
      const response = await fetch(`/api/source-content/${content.id}`);
      if (!response.ok) return;
      const detail = await response.json();
      if (detail?.id === content.id) setDetailContent(detail);
    } catch {
      // Keep the lightweight list row open if the detail fetch fails.
    }
  };

  const handleUseForGeneration = (content: SourceContent) => {
    router.push(`/generate?sourceIds=${content.id}`);
  };

  const handleGenerateWithSelected = () => {
    const ids = Array.from(selectedIds).join(',');
    router.push(`/generate?sourceIds=${ids}`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSearchScope('all');
    setSelectedType('');
    setSelectedTag('');
    setSelectedPublisher('');
    setPage(1);
  };

  const handleSelectAll = () => {
    if (contentItems.length) {
      const allIds = new Set(contentItems.map((c) => c.id));
      setSelectedIds(allIds);
    }
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handlePrevPage = () => {
    setPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    if (!data) return;
    if (!data.hasNextPage && page >= (data.totalPages || 1)) return;
    setPage((p) => p + 1);
  };

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <PageHeader
        eyebrow="Source inventory"
        title="Source Content"
        description="Browse synced advisor content and send selected articles into the generation workflow."
        metrics={[
          {
            label: `${totalAvailableItems.toLocaleString()} available`,
            detail: `${selectedIds.size} selected for generation`,
            icon: FolderOpen,
          },
          {
            label: `${data?.meta?.finraReviewedCount ?? 0} FINRA reviewed`,
            detail: 'Approved source pieces',
            icon: FolderOpen,
            iconClassName: 'bg-info text-info-foreground',
          },
          {
            label: 'Sync Broadridge Content',
            detail: (
              <div className="mt-0.5 space-y-2">
                <p className="text-xs leading-5 text-muted-foreground">
                  Last sync: {data?.meta?.lastSyncedAt ? new Date(data.meta.lastSyncedAt).toLocaleString() : 'n/a'}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md text-xs"
                  onClick={runBroadridgeContentSync}
                  disabled={runningSourceSync}
                  title="Runs the batched Broadridge provider sync from Source Content."
                >
                  {runningSourceSync ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                  {runningSourceSync ? 'Syncing...' : 'Sync Broadridge Content'}
                </Button>
                {syncProgress ? (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-muted-foreground">
                      Batch {syncProgress.currentBatch} of {syncProgress.maxBatches} · {syncProgress.processed.toLocaleString()} processed · {syncProgress.inserted.toLocaleString()} inserted · {syncProgress.updated.toLocaleString()} updated
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${syncProgressPercent}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ),
            icon: Database,
          },
        ]}
        variant="pink"
      />

      <ContentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchScope={searchScope}
        onSearchScopeChange={(scope) => {
          setSearchScope(scope);
          setPage(1);
        }}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        availableTypes={filters.availableTypes}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        availableTags={filters.availableTags}
        selectedPublisher={selectedPublisher}
        onPublisherChange={setSelectedPublisher}
        availablePublishers={filters.availablePublishers}
        onClearFilters={handleClearFilters}
      />

      {selectedIds.size > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleGenerateWithSelected} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate with {selectedIds.size} selected
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load source content. Please try again.
        </div>
      )}

      {!data && isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-lg bg-card animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="text-sm text-muted-foreground flex items-center justify-between gap-4">
            <span>
              Showing {contentItems.length} results (page {data.page}{data.hasNextPage ? '+' : ''})
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{selectedIds.size} item(s) selected</span>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  Select all
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                  Deselect all
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page <= 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!data.hasNextPage && page >= (data.totalPages || 1)}>
                  Next
                </Button>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contentItems.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                isSelected={selectedIds.has(content.id)}
                onSelect={handleSelect}
                onViewDetail={handleViewDetail}
                selectable
              />
            ))}
          </div>
          {contentItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No content found matching your filters</p>
              <Button variant="link" onClick={handleClearFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </>
      )}

      <ContentDetail
        content={detailContent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUseForGeneration={handleUseForGeneration}
      />
    </div>
  );
}
