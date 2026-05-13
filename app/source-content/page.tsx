'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ContentCard } from '@/components/source-content/content-card';
import { ContentFilters } from '@/components/source-content/content-filters';
import { ContentDetail } from '@/components/source-content/content-detail';
import type { SourceContent } from '@/lib/types/content';
import { Sparkles, RefreshCw, Database } from 'lucide-react';
import useSWR from 'swr';
import { toast } from 'sonner';

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
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SourceContentPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailContent, setDetailContent] = useState<SourceContent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);

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
    if (selectedType && selectedType !== 'all') params.set('type', selectedType);
    if (selectedTag && selectedTag !== 'all') params.set('tags', selectedTag);
    params.set('page', String(page));
    params.set('pageSize', '20');
    return `/api/source-content?${params.toString()}`;
  }, [debouncedQuery, selectedType, selectedTag, page]);

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(apiUrl(), fetcher);

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

  const runSync = async (mode: 'sample-seed' | 'provider', dryRun: boolean) => {
    const response = await fetch('/api/source-content/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, dryRun }),
    });

    const rawText = await response.text();
    let body: any = {};
    try { body = rawText ? JSON.parse(rawText) : {}; } catch { body = {}; }

    if (!response.ok) {
      const message = body?.error || rawText || `Sync failed (${response.status})`;
      toast.error(message);
      return;
    }

    if (dryRun) {
      toast.success(`${mode} dry run: would process ${body?.wouldProcess ?? body?.processed ?? 0} rows`);
      if ((body?.wouldProcess ?? body?.processed ?? 0) === 0 && body?.debug) {
        console.warn('Provider debug:', body.debug);
        toast.info(`Debug: dataType=${body.debug?.dataType || 'unknown'}, keys=${(body.debug?.dataKeys || []).join(',') || 'none'}`);
      }
      return;
    }

    toast.success(`${mode} sync complete: ${body?.processed ?? 0} processed (${body?.inserted ?? 0} inserted, ${body?.updated ?? 0} updated)`);
    if ((body?.processed ?? 0) === 0 && body?.debug) {
      console.warn('Provider debug:', body.debug);
      toast.info(`Debug: dataType=${body.debug?.dataType || 'unknown'}, keys=${(body.debug?.dataKeys || []).join(',') || 'none'}`);
    }
    mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Source Content</h1>
          <p className="text-muted-foreground">
            Browse existing content to use as inspiration for AI generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => runSync('sample-seed', true)}>
            <Database className="h-4 w-4 mr-2" />
            Dry Run Samples
          </Button>
          <Button variant="outline" size="sm" onClick={() => runSync('sample-seed', false)}>
            <Database className="h-4 w-4 mr-2" />
            Sync Samples
          </Button>
          <Button variant="outline" size="sm" onClick={() => runSync('provider', true)}>
            <Database className="h-4 w-4 mr-2" />
            Dry Run Provider
          </Button>
          <Button variant="outline" size="sm" onClick={() => runSync('provider', false)}>
            <Database className="h-4 w-4 mr-2" />
            Sync Provider
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {selectedIds.size > 0 && (
            <Button onClick={handleGenerateWithSelected} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate with {selectedIds.size} selected
            </Button>
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
        onClearFilters={handleClearFilters}
      />

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{selectedIds.size} item(s) selected</span>
          <Button variant="ghost" size="sm" onClick={handleSelectAll}>
            Select all
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
            Deselect all
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load source content. Please try again.
        </div>
      )}

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-lg bg-card animate-pulse" />
          ))}
        </div>
      )}

      {data && !isLoading && (
        <>
          <div className="text-sm text-muted-foreground flex items-center justify-between gap-4">
            <span>
              Showing {data.data.length} of {data.total} results (page {data.page} of {data.totalPages || 1})
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page <= 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextPage} disabled={page >= (data.totalPages || 1)}>
                Next
              </Button>
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
