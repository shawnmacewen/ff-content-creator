'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LibraryColumns, LibraryGrid, LibraryList } from '@/components/library/library-grid';
import { ContentEditor } from '@/components/library/content-editor';
import useSWR from 'swr';
import { mapGeneratedContentRows } from '@/lib/mappers/generated-content';
import { CONTENT_TYPES } from '@/lib/content-config';
import type { GeneratedContent } from '@/lib/types/content';
import { Box, Folder, Globe2, Columns3, LayoutGrid, List, Search, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';

export default function LibraryPage() {
  const [mounted, setMounted] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'columns'>('list');
  
  // Editor state
  const [selectedContent, setSelectedContent] = useState<GeneratedContent | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'view' | 'edit'>('view');

  useEffect(() => {
    setMounted(true);
  }, []);

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    return params.toString();
  }, [searchQuery, typeFilter]);

  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const { data, mutate } = useSWR<{ data: GeneratedContent[] }>(
    mounted ? `/api/generated-content?${qs}` : null,
    fetcher
  );

  const content = mapGeneratedContentRows(data?.data || []);
  const filteredContent = content;
  const savedMetrics = useMemo(() => {
    const combinedText = (item: GeneratedContent) => {
      const versionNotes = item.versions.map((version) => version.note || '').join(' ');
      return `${item.title} ${item.type} ${item.prompt} ${versionNotes}`.toLowerCase();
    };
    const campaignKits = content.filter((item) => /\b(campaign|kit)\b/i.test(combinedText(item))).length;
    const bilingualPairs = content.filter((item) => combinedText(item).includes('canadianizer')).length;
    const singleAssets = Math.max(0, content.length - campaignKits - bilingualPairs);

    return [
      { label: 'saved packages', value: content.length, icon: Folder, className: 'bg-blue-50 text-blue-700 border-blue-100' },
      { label: 'campaign kits', value: campaignKits, icon: Sparkles, className: 'bg-violet-50 text-violet-700 border-violet-100' },
      { label: 'single assets', value: singleAssets, icon: Box, className: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
      { label: 'bilingual pairs', value: bilingualPairs, icon: Globe2, className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    ];
  }, [content]);

  const handleView = useCallback((item: GeneratedContent) => {
    setSelectedContent(item);
    setEditorMode('view');
    setEditorOpen(true);
  }, []);

  const handleEdit = useCallback((item: GeneratedContent) => {
    setSelectedContent(item);
    setEditorMode('edit');
    setEditorOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const response = await fetch(`/api/generated-content/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      toast.error('Failed to delete content');
      return;
    }
    await mutate();
    toast.success('Content deleted');
  }, [mutate]);

  const handleCopy = useCallback(async (contentText: string) => {
    await navigator.clipboard.writeText(contentText);
    toast.success('Content copied to clipboard');
  }, []);

  const handleSave = useCallback(async (updatedContent: GeneratedContent) => {
    const response = await fetch(`/api/generated-content/${updatedContent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: updatedContent.title,
        content: updatedContent.content,
        tone: updatedContent.tone,
        prompt: updatedContent.prompt,
        sourceContentIds: updatedContent.sourceContentIds,
        versionNote: 'Edited in Saved Content',
      }),
    });

    if (!response.ok) {
      toast.error('Failed to update content');
      return;
    }

    await mutate();
    toast.success('Content updated');
  }, [mutate]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
  };

  const hasActiveFilters = searchQuery || typeFilter !== 'all';

  if (!mounted) {
    return (
      <div className="flex w-full max-w-none flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Saved Content</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-lg bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <PageHeader
        eyebrow="Saved workspace"
        title="Saved Content"
        description="Manage saved drafts, reviewed assets, and reusable campaign content."
        metrics={[]}
        variant="yellow"
      />

      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search saved content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] bg-muted/50">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {CONTENT_TYPES.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={handleClearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {savedMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 shadow-sm">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${metric.className}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="leading-none">
                    <span className="block text-sm font-bold text-slate-950">{metric.value}</span>
                    <span className="block text-[10px] font-medium leading-3 text-slate-500">{metric.label}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="ml-auto inline-flex overflow-hidden rounded-md border border-slate-200 bg-white">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`h-9 rounded-none gap-2 px-3 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-700 hover:bg-blue-50' : 'text-slate-600'}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`h-9 rounded-none gap-2 border-l border-slate-200 px-3 ${viewMode === 'list' ? 'bg-blue-50 text-blue-700 hover:bg-blue-50' : 'text-slate-600'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`h-9 rounded-none gap-2 border-l border-slate-200 px-3 ${viewMode === 'columns' ? 'bg-blue-50 text-blue-700 hover:bg-blue-50' : 'text-slate-600'}`}
              onClick={() => setViewMode('columns')}
            >
              <Columns3 className="h-4 w-4" />
              Columns
            </Button>
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredContent.length} of {content.length} items
        </p>
      )}

      {viewMode === 'grid' ? (
        <LibraryGrid
          items={filteredContent}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
        />
      ) : viewMode === 'list' ? (
        <LibraryList
          items={filteredContent}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
        />
      ) : (
        <LibraryColumns
          items={filteredContent}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
        />
      )}

      <ContentEditor
        content={selectedContent}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSave}
        mode={editorMode}
      />
    </div>
  );
}
