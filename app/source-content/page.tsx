'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ContentCard } from '@/components/source-content/content-card';
import { ContentFilters } from '@/components/source-content/content-filters';
import { ContentDetail } from '@/components/source-content/content-detail';
import type { SourceContent } from '@/lib/types/content';
import { Sparkles, RefreshCw, Database, Info, FolderOpen, ShieldCheck } from 'lucide-react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface ApiResponse {
  data: SourceContent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SourceContentPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedPublisher, setSelectedPublisher] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailContent, setDetailContent] = useState<SourceContent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [syncingMode, setSyncingMode] = useState<null | 'provider'>(null);

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
    if (selectedType && selectedType !== 'all') params.set('contentDesignation', selectedType);
    if (selectedTag && selectedTag !== 'all') params.set('tags', selectedTag);
    if (selectedPublisher && selectedPublisher !== 'all') params.set('publisher', selectedPublisher);
    params.set('page', String(page));
    params.set('pageSize', '20');
    return `/api/source-content?${params.toString()}`;
  }, [debouncedQuery, selectedType, selectedTag, selectedPublisher, page]);

  const { data, error, isLoading, isValidating, mutate } = useSWR<ApiResponse>(apiUrl(), fetcher, {
    keepPreviousData: true,
  });

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

  const handleViewDetail = (content: SourceContent) => {
    setDetailContent(content);
    setDetailOpen(true);
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
    setSelectedType('');
    setSelectedTag('');
    setSelectedPublisher('');
    setPage(1);
  };

  const handleSelectAll = () => {
    if (data?.data) {
      const allIds = new Set(data.data.map((c) => c.id));
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
    setPage((p) => Math.min(data.totalPages || 1, p + 1));
  };

  const runProviderSync = async () => {
    setSyncingMode('provider');
    toast.info('Broadridge Content API sync started...');

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

    const rawText = await response.text();
    let body: any = {};
    try { body = rawText ? JSON.parse(rawText) : {}; } catch { body = {}; }

    if (!response.ok) {
      const message = body?.error || rawText || `Sync failed (${response.status})`;
      toast.error(message);
      setSyncingMode(null);
      return;
    }

    toast.success(`Broadridge Content API sync complete: ${body?.processed ?? 0} processed (${body?.inserted ?? 0} inserted, ${body?.updated ?? 0} updated)`);
    mutate();
    setSyncingMode(null);
  };

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="bg-[linear-gradient(135deg,#11285a_0%,#143a7b_58%,#0f6f8f_100%)] p-6 text-white sm:p-7">
            <Badge className="mb-4 border-white/20 bg-white/10 text-white hover:bg-white/10">
              Source inventory
            </Badge>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight">Source Content</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50/85">
              Browse synced advisor content and send selected articles into the generation workflow.
            </p>
          </div>
          <div className="grid content-center gap-3 bg-secondary/60 p-6 sm:p-7">
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <FolderOpen className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{data?.total ?? 0} available items</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedIds.size} selected for generation
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-info text-info-foreground">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{data?.meta?.finraReviewedCount ?? 0} FINRA reviewed</p>
                  <p className="text-xs text-muted-foreground">
                    approved source content pieces
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runProviderSync}
              disabled={syncingMode !== null}
              title="This button will sync the first 500 pieces of Broadridge Advisor Content pieces from the Broadridge Content API to seed this database. These 500 pieces are not in a specific order. For more advanced API calls use the API Lab."
            >
              <Database className={`h-4 w-4 mr-2 ${syncingMode === 'provider' ? 'animate-pulse' : ''}`} />
              {syncingMode === 'provider' ? 'Syncing Broadridge Content API...' : 'Sync Broadridge Content API'}
              <Info className="h-3.5 w-3.5 ml-2 text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              disabled={false}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {selectedIds.size > 0 && (
              <Button onClick={handleGenerateWithSelected} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Generate with {selectedIds.size} selected
              </Button>
            )}
          </div>
          {data && (
            <div className="text-[10px] leading-tight text-muted-foreground/70">
              Last synced: {data?.meta?.lastSyncedAt ? new Date(data.meta.lastSyncedAt).toLocaleString() : 'n/a'} · Sources: {Object.entries(data?.meta?.sourceCounts || {}).map(([k,v]) => `${k}: ${v}`).join(' | ') || 'n/a'}
            </div>
          )}
        </div>
      </div>

      <ContentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        availableTypes={data?.filters?.availableTypes || []}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        availableTags={data?.filters?.availableTags || []}
        selectedPublisher={selectedPublisher}
        onPublisherChange={setSelectedPublisher}
        availablePublishers={data?.filters?.availablePublishers || []}
        onClearFilters={handleClearFilters}
      />

      <div className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium">
        Broadridge Advisor Content: {data?.meta?.publisherCounts?.['broadridge-forefield'] ?? 0}
      </div>


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
              Showing {data.data.length} of {data.total} results (page {data.page} of {data.totalPages || 1})
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
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={page >= (data.totalPages || 1)}>
                  Next
                </Button>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.data.map((content) => (
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
          {data.data.length === 0 && (
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
