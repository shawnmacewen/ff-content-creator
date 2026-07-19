'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Columns2, GalleryHorizontal, Info, LayoutGrid, List, Rows3, Search, X } from 'lucide-react';

export type SourceContentViewMode = 'grid' | 'small-grid' | 'detailed-grid' | 'stacked' | 'quick';

interface ContentFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchScope: string;
  onSearchScopeChange: (scope: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  availableTypes: string[];
  selectedTag: string;
  onTagChange: (tag: string) => void;
  availableTags: string[];
  selectedPublisher: string;
  onPublisherChange: (publisher: string) => void;
  availablePublishers: string[];
  viewMode: SourceContentViewMode;
  onViewModeChange: (viewMode: SourceContentViewMode) => void;
  onClearFilters: () => void;
}

export function ContentFilters({
  searchQuery,
  onSearchChange,
  searchScope,
  onSearchScopeChange,
  selectedType,
  onTypeChange,
  availableTypes,
  selectedTag,
  onTagChange,
  availableTags,
  selectedPublisher,
  onPublisherChange,
  availablePublishers,
  viewMode,
  onViewModeChange,
  onClearFilters,
}: ContentFiltersProps) {
  const hasActiveFilters = searchQuery || searchScope !== 'all' || selectedType || selectedTag || selectedPublisher;
  const viewOptions: Array<{ value: SourceContentViewMode; label: string; icon: typeof LayoutGrid }> = [
    { value: 'grid', label: 'Card grid', icon: LayoutGrid },
    { value: 'small-grid', label: 'Small grid', icon: GalleryHorizontal },
    { value: 'detailed-grid', label: 'Detailed cards', icon: Columns2 },
    { value: 'stacked', label: 'Stacked list', icon: Rows3 },
    { value: 'quick', label: 'Quick list', icon: List },
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-white pl-9"
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label="How Source Content search works"
            >
              <Info className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end" className="max-w-[360px] text-left leading-5">
            <div className="space-y-2">
              <div className="font-semibold">Searches loaded content</div>
              <p>
                Search runs against the source articles currently loaded in this page. Use Load more or Load full library above to expand what can be searched.
              </p>
              <p>
                Search all checks titles, filenames, summaries, tags, takeaways, audience notes, and body text. Title only and Filename only narrow the match field.
              </p>
              <p>
                Filters combine with search, so designation, tag, and publisher choices can hide otherwise matching articles.
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Select value={searchScope} onValueChange={onSearchScopeChange}>
          <SelectTrigger className="w-[135px] bg-white">
            <SelectValue placeholder="Search all" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Search all</SelectItem>
            <SelectItem value="title">Title only</SelectItem>
            <SelectItem value="filename">Filename only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedType} onValueChange={onTypeChange}>
          <SelectTrigger className="w-[140px] bg-white">
            <SelectValue placeholder="All designations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All designations</SelectItem>
            {availableTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedTag} onValueChange={onTagChange}>
          <SelectTrigger className="w-[140px] bg-white">
            <SelectValue placeholder="All tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {availableTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedPublisher} onValueChange={onPublisherChange}>
          <SelectTrigger className="w-[170px] bg-white">
            <SelectValue placeholder="All publishers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All publishers</SelectItem>
            {availablePublishers.map((publisher) => (
              <SelectItem key={publisher} value={publisher}>
                {publisher}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) onViewModeChange(value as SourceContentViewMode);
          }}
          variant="outline"
          size="sm"
          className="h-10 rounded-md border border-border bg-white p-1"
          aria-label="Source content view"
        >
          {viewOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Tooltip key={option.value}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value={option.value}
                    aria-label={option.label}
                    className="h-8 w-8 rounded-sm p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    <Icon className="h-4 w-4" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>{option.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </ToggleGroup>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearFilters}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
