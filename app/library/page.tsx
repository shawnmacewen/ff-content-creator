'use client';

import { useEffect, useState, useCallback } from 'react';
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
import {
  getStoredContent,
  saveContent,
  deleteContent,
} from '@/lib/storage/local-storage';
import { CONTENT_TYPES } from '@/lib/content-config';
import type { GeneratedContent, ContentType, ContentStatus } from '@/lib/types/content';
import { Search, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

export default function LibraryPage() {
  const router = useRouter();
  const [content, setContent] = useState<GeneratedContent[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Editor state
  const [selectedContent, setSelectedContent] = useState<GeneratedContent | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'view' | 'edit'>('view');

  // Load content on mount
  useEffect(() => {
    setMounted(true);
    setContent(getStoredContent());
  }, []);

  // Filter content
  const filteredContent = content.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

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

  const handleDelete = useCallback((id: string) => {
    deleteContent(id);
    setContent(getStoredContent());
    toast.success('Content deleted');
  }, []);

  const handleCopy = useCallback(async (contentText: string) => {
    await navigator.clipboard.writeText(contentText);
    toast.success('Content copied to clipboard');
  }, []);

  const handleSave = useCallback((updatedContent: GeneratedContent) => {
    saveContent(updatedContent);
    setContent(getStoredContent());
    toast.success('Content updated');
  }, []);

  const handleClearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchQuery || typeFilter !== 'all' || statusFilter !== 'all';

  if (!mounted) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Library</h1>
          <p className="text-muted-foreground">
            Manage your generated content - {content.length} items
          </p>
        </div>
        <Button onClick={() => router.push('/generate')} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate New
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
