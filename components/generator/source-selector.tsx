'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SourceContent } from '@/lib/types/content';
import { Search, X, FileText } from 'lucide-react';
import useSWR from 'swr';

interface SourceSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

interface ApiResponse {
  data: SourceContent[];
  total: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SourceSelector({ selectedIds, onSelectionChange }: SourceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const apiUrl = debouncedQuery
    ? `/api/source-content?q=${encodeURIComponent(debouncedQuery)}&pageSize=50`
    : '/api/source-content?pageSize=50';

  const { data, isLoading } = useSWR<ApiResponse>(apiUrl, fetcher);

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Source Content</CardTitle>
            <CardDescription>Select existing content to base your generation on</CardDescription>
          </div>
          {selectedIds.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              Clear all ({selectedIds.length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search source content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <ScrollArea className="h-[280px]">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {data && !isLoading && (
            <div className="space-y-2 pr-4">
              {data.data.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No content found</p>
                </div>
              )}
              {data.data.map((content) => {
                const isSelected = selectedIds.includes(content.id);
                
                return (
                  <div
                    key={content.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                    onClick={() => handleToggle(content.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(content.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{content.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {content.excerpt}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-xs">
                          {content.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{content.author}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {selectedIds.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {selectedIds.length} source(s) selected - AI will use this content as reference material
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
