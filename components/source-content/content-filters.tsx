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
  selectedType: string;
  onTypeChange: (type: string) => void;
  availableTypes: string[];
  selectedTag: string;
  onTagChange: (tag: string) => void;
  availableTags: string[];
  onClearFilters: () => void;
}

export function ContentFilters({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  availableTypes,
  selectedTag,
  onTagChange,
  availableTags,
  onClearFilters,
}: ContentFiltersProps) {
  const hasActiveFilters = searchQuery || selectedType || selectedTag;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search content..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-muted/50"
        />
      </div>
      
      <div className="flex gap-2">
        <Select value={selectedType} onValueChange={onTypeChange}>
          <SelectTrigger className="w-[140px] bg-muted/50">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {availableTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedTag} onValueChange={onTagChange}>
          <SelectTrigger className="w-[140px] bg-muted/50">
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
