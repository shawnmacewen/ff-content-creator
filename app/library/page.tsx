'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LibraryGrid } from '@/components/library/library-grid';
import { ContentEditor } from '@/components/library/content-editor';
import useSWR from 'swr';
import { mapGeneratedContentRows } from '@/lib/mappers/generated-content';
import { CONTENT_TYPES } from '@/lib/content-config';
import type { GeneratedContent, ContentType, ContentStatus } from '@/lib/types/content';
import { Library, Search, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function LibraryPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
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
    if (statusFilter !== 'all') params.set('status', statusFilter);
    return params.toString();
  }, [searchQuery, typeFilter, statusFilter]);

  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const { data, mutate } = useSWR<{ data: GeneratedContent[] }>(
    mounted ? `/api/generated-content?${qs}` : null,
    fetcher
  );

  const content = mapGeneratedContentRows(data?.data || []);
  const filteredContent = content;

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
        status: updatedContent.status,
        tone: updatedContent.tone,
        prompt: updatedContent.prompt,
        sourceContentIds: updatedContent.sourceContentIds,
        versionNote: 'Edited in library',
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
    setStatusFilter('all');
  };

  const hasActiveFilters = searchQuery || typeFilter !== 'all' || statusFilter !== 'all';

  if (!mounted) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Content Library</h1>
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="bg-[linear-gradient(135deg,#11285a_0%,#143a7b_58%,#0f6f8f_100%)] p-6 text-white sm:p-7">
            <Badge className="mb-4 border-white/20 bg-white/10 text-white hover:bg-white/10">
              Generated assets
            </Badge>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight">Content Library</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50/85">
              Manage saved drafts, review assets, and reusable campaign content.
            </p>
          </div>
          <div className="grid content-center gap-3 bg-secondary/60 p-6 sm:p-7">
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Library className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{content.length} library items</p>
                  <p className="text-xs text-muted-foreground">Drafts, review items, and published assets.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end rounded-lg border border-border bg-card p-4 shadow-sm">
        <Button onClick={() => router.push('/generate')} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate New
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50"
          />
        </div>
        
        <div className="flex gap-2">
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

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] bg-muted/50">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={handleClearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredContent.length} of {content.length} items
        </p>
      )}

      <LibraryGrid
        items={filteredContent}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCopy={handleCopy}
      />

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
