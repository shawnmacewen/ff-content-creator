'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ContentCard } from '@/components/source-content/content-card';
import { ContentFilters } from '@/components/source-content/content-filters';
import { ContentDetail } from '@/components/source-content/content-detail';
import type { SourceContent } from '@/lib/types/content';
import { Sparkles } from 'lucide-react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { PageHeader } from '@/components/layout/page-header';
import { toast } from 'sonner';
import {
  normalizeSourceSearchValue,
  sourceContentMatchesQuery,
  type SourceContentSearchScope,
} from '@/lib/source-content/search';

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

const SOURCE_CONTENT_PAGE_SIZE = 50;

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
  const [autoLoadAll, setAutoLoadAll] = useState(false);
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
  const apiUrl = useCallback((pageIndex: number, previousPageData: ApiResponse | null) => {
    if (previousPageData && !previousPageData.hasNextPage) return null;

    const params = new URLSearchParams();
    params.set('page', String(pageIndex + 1));
    params.set('pageSize', String(SOURCE_CONTENT_PAGE_SIZE));
    return `/api/source-content?${params.toString()}`;
  }, []);

  const {
    data: pages,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
    mutate: mutateSourceContent,
  } = useSWRInfinite<ApiResponse>(apiUrl, fetcher, {
    keepPreviousData: true,
    revalidateFirstPage: false,
    shouldRetryOnError: false,
  });
  const { data: filterData } = useSWR<FilterResponse>('/api/source-content/filters', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const contentItems = useMemo(() => {
    const seen = new Set<string>();
    const items: SourceContent[] = [];
    for (const pageData of pages || []) {
      for (const item of pageData.data || []) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        items.push(item);
      }
    }
    return items;
  }, [pages]);
  const visibleContentItems = useMemo(() => {
    const query = normalizeSourceSearchValue(debouncedQuery);
    const scope = ['all', 'title', 'filename'].includes(searchScope)
      ? (searchScope as SourceContentSearchScope)
      : 'all';

    return contentItems.filter((content) => {
      const typeOk = !selectedType || selectedType === 'all' || content.type === selectedType;
      const tagOk = !selectedTag || selectedTag === 'all' || (content.tags || []).some((tag) => tag === selectedTag);
      const publisherOk = !selectedPublisher || selectedPublisher === 'all' || content.publisher === selectedPublisher;
      if (!typeOk || !tagOk || !publisherOk) return false;
      if (!query) return true;

      return sourceContentMatchesQuery(content, query, scope);
    });
  }, [contentItems, debouncedQuery, searchScope, selectedPublisher, selectedTag, selectedType]);
  const latestPage = pages?.[pages.length - 1] ?? null;
  const filters = filterData || latestPage?.filters || emptyFilters;
  const totalAvailableItems = latestPage?.meta?.totalSourceContent || latestPage?.total || pages?.[0]?.total || 0;
  const hasNextPage = Boolean(latestPage?.hasNextPage);
  const loadedCount = contentItems.length;
  const isLoadingMore = isValidating && Boolean(pages?.length);
  const contentLoadProgressPercent = totalAvailableItems
    ? Math.max(4, Math.min(100, Math.round((loadedCount / totalAvailableItems) * 100)))
    : isLoadingMore
      ? 8
      : 0;
  const hasActiveFilters = Boolean(
    debouncedQuery ||
    (searchScope && searchScope !== 'all') ||
    (selectedType && selectedType !== 'all') ||
    (selectedTag && selectedTag !== 'all') ||
    (selectedPublisher && selectedPublisher !== 'all')
  );
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
  };

  useEffect(() => {
    if (!autoLoadAll || !hasNextPage || isValidating) return;
    void setSize(size + 1);
  }, [autoLoadAll, hasNextPage, isValidating, setSize, size]);

  useEffect(() => {
    if (autoLoadAll && !hasNextPage && !isValidating) setAutoLoadAll(false);
  }, [autoLoadAll, hasNextPage, isValidating]);

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <PageHeader
        eyebrow="Source inventory"
        title="Source Content"
        description="Browse synced advisor content and send selected articles into the generation workflow."
        metrics={[]}
        variant="pink"
      />

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load source content. Please try again.
        </div>
      )}

      {!pages && isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-lg bg-card animate-pulse" />
          ))}
        </div>
      )}

      {latestPage && (
        <>
          <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <span className="font-medium text-foreground">
                  Loaded {loadedCount.toLocaleString()}{totalAvailableItems ? ` of ${totalAvailableItems.toLocaleString()}` : ''} articles
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {hasNextPage ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md text-xs"
                        disabled={isLoadingMore}
                        onClick={() => void setSize(size + 1)}
                      >
                        {isLoadingMore ? 'Loading...' : `Load ${SOURCE_CONTENT_PAGE_SIZE} more`}
                      </Button>
                      <Button
                        type="button"
                        variant={autoLoadAll ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 rounded-md text-xs"
                        disabled={isLoadingMore && !autoLoadAll}
                        onClick={() => setAutoLoadAll((value) => !value)}
                      >
                        {autoLoadAll ? 'Stop full load' : 'Load full library'}
                      </Button>
                    </>
                  ) : loadedCount ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">All loaded</span>
                  ) : null}
                </div>
                <div className="flex min-w-[220px] items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${contentLoadProgressPercent}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-medium text-muted-foreground">
                    {totalAvailableItems ? `${contentLoadProgressPercent}%` : isLoadingMore ? '...' : '0%'}
                  </span>
                </div>
                <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-slate-200">
                  {(latestPage?.meta?.finraReviewedCount ?? 0).toLocaleString()} FINRA reviewed
                </span>
                {hasActiveFilters ? (
                  <span className="text-xs font-medium text-muted-foreground">
                    Showing {visibleContentItems.length.toLocaleString()} Search Results
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground xl:justify-end">
                {selectedIds.size > 0 ? (
                  <Button onClick={handleGenerateWithSelected} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate with {selectedIds.size} selected
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md text-xs font-bold"
                  onClick={runBroadridgeContentSync}
                  disabled={runningSourceSync}
                  title="Runs the batched Broadridge provider sync from Source Content."
                >
                  {runningSourceSync ? 'Syncing...' : 'Sync Broadridge Content'}
                </Button>
              </div>
            </div>
            {syncProgress ? (
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
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
          <ContentFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchScope={searchScope}
            onSearchScopeChange={setSearchScope}
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleContentItems.map((content) => (
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
          {visibleContentItems.length === 0 && (
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
