'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';

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
  onClearFilters,
}: ContentFiltersProps) {
  const hasActiveFilters = searchQuery || searchScope !== 'all' || selectedType || selectedTag || selectedPublisher;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search content..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-white pl-9"
        />
      </div>
      
      <div className="flex gap-2">
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
