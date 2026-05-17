'use client';

import * as React from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SourceContent } from '@/lib/types/content';
import { Search, Filter, ChevronDown, Check } from 'lucide-react';

type Topic = 'All Topics' | 'Markets' | 'Economy' | 'Energy' | 'AI & Tech' | 'Banking' | 'Geopolitics' | 'ESG';

interface ApiResponse {
  data: SourceContent[];
  total: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDate(s?: string) {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

export function SourceArticlePicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [topic, setTopic] = React.useState<Topic>('All Topics');

  // API currently supports q + pageSize; topic is UI-only for now.
  const apiUrl = query
    ? `/api/source-content?q=${encodeURIComponent(query)}&pageSize=50`
    : '/api/source-content?pageSize=50';

  const { data, isLoading } = useSWR<ApiResponse>(apiUrl, fetcher);

  const topics: Topic[] = ['All Topics', 'Markets', 'Economy', 'Energy', 'AI & Tech', 'Banking', 'Geopolitics', 'ESG'];

  const filtered = React.useMemo(() => {
    const items = data?.data ?? [];
    if (topic === 'All Topics') return items;
    // best-effort filtering via tags/type/title
    const needle = topic.toLowerCase();
    return items.filter((c) => {
      const hay = `${c.type} ${c.title} ${(c.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [data, topic]);

  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="text-base">Select a Source Article</CardTitle>
          <div className="mt-1 text-sm text-muted-foreground">Choose an article to generate content from.</div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles by title, keyword, or topic..."
              className="h-10 rounded-2xl pl-9 bg-muted/40"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="h-10 rounded-2xl gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button type="button" variant="outline" className="h-10 rounded-2xl gap-2">
              Newest First
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-1 flex flex-wrap gap-2">
          {topics.map((t) => {
            const active = t === topic;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-violet-500/60 bg-violet-600 text-white'
                    : 'bg-background/60 text-muted-foreground hover:bg-background'
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[360px]">
          {isLoading && (
            <div className="space-y-3 pr-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && (
            <div className="space-y-3 pr-4">
              {filtered.length === 0 ? (
                <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">No articles found.</div>
              ) : null}

              {filtered.map((c) => {
                const selected = selectedId === c.id;
                const words = c.body ? c.body.split(/\s+/).filter(Boolean).length : 0;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelect(selected ? null : c.id)}
                    className={cn(
                      'relative w-full rounded-2xl border bg-background/60 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                      selected && 'border-violet-500/60 ring-2 ring-violet-500/30 bg-violet-500/5'
                    )}
                  >
                    <div className="flex gap-4">
                      <div className="h-16 w-28 overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/25 via-fuchsia-500/10 to-transparent">
                        {(() => {
                          const thumb = c?.metadata?.SocialMediaPlatformImages?.Thumbnail as string | undefined;
                          if (!thumb) return null;
                          // eslint-disable-next-line @next/next/no-img-element
                          return <img src={thumb} alt="" className="h-full w-full object-cover" />;
                        })()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{c.title}</div>
                            <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{c.excerpt}</div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right text-[11px] text-muted-foreground">
                              <div>{formatDate(c.publishedAt) || '—'}</div>
                              <div>{words ? `${words.toLocaleString()} words` : ''}</div>
                            </div>

                            <div
                              className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-full border',
                                selected ? 'border-violet-500 bg-violet-600 text-white' : 'border-muted text-muted-foreground'
                              )}
                              aria-hidden
                            >
                              {selected ? <Check className="h-4 w-4" /> : null}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {(c.tags || []).slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="rounded-full text-[11px]">
                              {tag}
                            </Badge>
                          ))}
                          {!c.tags?.length ? (
                            <Badge variant="outline" className="rounded-full text-[11px]">
                              {c.type}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          {selectedId ? '1 article selected — AI will use this as the source material.' : 'Select an article to continue.'}
        </div>
      </CardContent>
    </Card>
  );
}
