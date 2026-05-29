'use client';

import * as React from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { designationLabelClass, tagLabelClass } from '@/lib/content-label-colors';
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
  compact = false,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  compact?: boolean;
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

    const decodeLite = (s: string) =>
      String(s || '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");

    const topicNeedles: Record<Topic, string[]> = {
      'All Topics': [],
      Markets: ['markets', 'market', 'stocks', 'equities', 'bonds', 'fixed income'],
      Economy: ['economy', 'economic', 'inflation', 'gdp', 'jobs', 'labor'],
      Energy: ['energy', 'oil', 'crude', 'petroleum', 'gas', 'opec'],
      'AI & Tech': ['ai', 'tech', 'technology', 'crypto', 'digital assets', 'blockchain'],
      Banking: ['bank', 'banking', 'credit', 'lending', 'rates'],
      Geopolitics: ['geopolitics', 'war', 'conflict', 'sanctions', 'election'],
      ESG: ['esg', 'sustainable', 'sustainability', 'responsible', 'impact', 'investing'],
    };

    const needles = topic === 'All Topics' ? [] : (topicNeedles[topic] || [topic]).map((s) => s.toLowerCase());
    const q = query.trim().toLowerCase();

    return items.filter((c) => {
      const tagText = (c.tags || []).map((t) => decodeLite(String(t))).join(' ');
      const hay = `${decodeLite(String(c.type || ''))} ${decodeLite(String(c.title || ''))} ${decodeLite(String(c.excerpt || ''))} ${tagText}`.toLowerCase();

      const topicOk = !needles.length || needles.some((n) => hay.includes(n));
      const searchOk = !q || hay.includes(q);
      return topicOk && searchOk;
    });
  }, [data, topic, query]);

  if (compact) {
    return (
      <Card className="overflow-hidden rounded-2xl border bg-card/95 shadow-sm">
        <CardHeader className="px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Articles</div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              title="Clear selected article"
              onClick={() => onSelect(null)}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ScrollArea className="h-[640px] overflow-x-hidden">
            {isLoading ? (
              <div className="space-y-3 px-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3 px-1">
                {filtered.map((c) => {
                  const selected = selectedId === c.id;
                  let meta: any = c?.metadata;
                  if (typeof meta === 'string') {
                    try {
                      meta = JSON.parse(meta);
                    } catch {
                      meta = null;
                    }
                  }

                  const fromExtraPropertiesArray = (key: string): string | undefined => {
                    const arr = meta?.raw?.extra_properties;
                    if (!Array.isArray(arr)) return undefined;
                    const hit = arr.find((x: any) => String(x?.key || '') === key);
                    const v = hit?.stringValue ?? hit?.value ?? hit?.string_value;
                    return typeof v === 'string' ? v : undefined;
                  };

                  const extraMap: any = meta?.extraProperties || meta?.raw?.extraProperties || null;
                  const thumb =
                    (extraMap?.['SocialMediaPlatformImages.LinkedIn'] as string | undefined) ||
                    (meta?.['SocialMediaPlatformImages.LinkedIn'] as string | undefined) ||
                    fromExtraPropertiesArray('SocialMediaPlatformImages.LinkedIn') ||
                    (meta?.SocialMediaPlatformImages?.LinkedIn as string | undefined) ||
                    (meta?.SocialMediaPlatformImages?.linkedIn as string | undefined) ||
                    (meta?.SocialMediaPlatformImages?.linkedin as string | undefined) ||
                    (meta?.socialMediaPlatformImages?.LinkedIn as string | undefined) ||
                    (meta?.socialMediaPlatformImages?.linkedIn as string | undefined) ||
                    (meta?.socialMediaPlatformImages?.linkedin as string | undefined) ||
                    (extraMap?.['SocialMediaPlatformImages.Thumbnail'] as string | undefined) ||
                    (meta?.['SocialMediaPlatformImages.Thumbnail'] as string | undefined) ||
                    fromExtraPropertiesArray('SocialMediaPlatformImages.Thumbnail') ||
                    (meta?.SocialMediaPlatformImages?.Thumbnail as string | undefined) ||
                    (meta?.SocialMediaPlatformImages?.thumbnail as string | undefined) ||
                    (meta?.socialMediaPlatformImages?.Thumbnail as string | undefined) ||
                    (meta?.socialMediaPlatformImages?.thumbnail as string | undefined) ||
                    (c?.imageUrl as string | undefined);

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelect(selected ? null : c.id)}
                      title={c.title}
                      className={cn(
                        'group relative block h-16 w-full overflow-hidden rounded-xl border bg-muted text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                      )}
                    >
                      {thumb ? (
                        <div
                          className="h-full w-full bg-cover bg-center transition group-hover:scale-105"
                          style={{ backgroundImage: `url("${String(thumb).trim().replace(/"/g, '\\"')}")` }}
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-primary/25 via-info/10 to-transparent" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                      {selected ? (
                        <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-md border bg-card shadow-sm">
      <CardHeader className="pb-4">


        <div className="mt-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles by title, keyword, or topic..."
              className="h-10 rounded-md pl-9 bg-muted/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button type="button" variant="outline" className="h-10 justify-center rounded-md gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button type="button" variant="outline" className="h-10 justify-center rounded-md gap-2">
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
                    ? 'border-primary/60 bg-primary text-white'
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
        <ScrollArea className="h-[520px] pb-2 overflow-x-hidden">
          {isLoading && (
            <div className="space-y-3 pr-2 pb-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && (
            <div className="space-y-3 pr-2 pb-4">
              {filtered.length === 0 ? (
                <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">No articles found.</div>
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
                      'relative w-full max-w-full overflow-hidden rounded-md border bg-background/60 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                      selected && 'border-primary/60 ring-2 ring-primary/30 bg-primary/10'
                    )}
                  >
                    <div className="flex w-full min-w-0 gap-4">
                      <div className="h-16 w-28 overflow-hidden rounded-md bg-gradient-to-br from-primary/25 via-info/10 to-transparent">
                        {(() => {
                          let meta: any = c?.metadata;
                          if (typeof meta === 'string') {
                            try {
                              meta = JSON.parse(meta);
                            } catch {
                              meta = null;
                            }
                          }

                          const fromExtraPropertiesArray = (key: string): string | undefined => {
                            const arr = meta?.raw?.extra_properties;
                            if (!Array.isArray(arr)) return undefined;
                            const hit = arr.find((x: any) => String(x?.key || '') === key);
                            const v = hit?.stringValue ?? hit?.value ?? hit?.string_value;
                            return typeof v === 'string' ? v : undefined;
                          };

                          const extraMap: any = meta?.extraProperties || meta?.raw?.extraProperties || null;

                          const thumb =
                            // Prefer LinkedIn URL from CMS metadata (full external URL)
                            (extraMap?.['SocialMediaPlatformImages.LinkedIn'] as string | undefined) ||
                            (meta?.['SocialMediaPlatformImages.LinkedIn'] as string | undefined) ||
                            fromExtraPropertiesArray('SocialMediaPlatformImages.LinkedIn') ||
                            (meta?.SocialMediaPlatformImages?.LinkedIn as string | undefined) ||
                            (meta?.SocialMediaPlatformImages?.linkedIn as string | undefined) ||
                            (meta?.SocialMediaPlatformImages?.linkedin as string | undefined) ||
                            (meta?.socialMediaPlatformImages?.LinkedIn as string | undefined) ||
                            (meta?.socialMediaPlatformImages?.linkedIn as string | undefined) ||
                            (meta?.socialMediaPlatformImages?.linkedin as string | undefined) ||
                            // Fallbacks
                            (extraMap?.['SocialMediaPlatformImages.Thumbnail'] as string | undefined) ||
                            (meta?.['SocialMediaPlatformImages.Thumbnail'] as string | undefined) ||
                            fromExtraPropertiesArray('SocialMediaPlatformImages.Thumbnail') ||
                            (meta?.SocialMediaPlatformImages?.Thumbnail as string | undefined) ||
                            (meta?.SocialMediaPlatformImages?.thumbnail as string | undefined) ||
                            (meta?.socialMediaPlatformImages?.Thumbnail as string | undefined) ||
                            (meta?.socialMediaPlatformImages?.thumbnail as string | undefined) ||
                            (c?.imageUrl as string | undefined);

                          if (!thumb) return null;
                          return (
                            <img
                              src={String(thumb).trim()}
                              alt=""
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          );
                        })()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold leading-snug line-clamp-2">{c.title}</div>
                            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.excerpt}</div>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <div className="text-right text-[11px] text-muted-foreground whitespace-nowrap">
                              <div>{formatDate(c.publishedAt) || '—'}</div>
                              <div>{words ? `${words.toLocaleString()} words` : ''}</div>
                            </div>

                            <div
                              className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-full border',
                                selected ? 'border-primary bg-primary text-white' : 'border-muted text-muted-foreground'
                              )}
                              aria-hidden
                            >
                              {selected ? <Check className="h-4 w-4" /> : null}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {(c.tags || []).slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className={cn('rounded-full text-[11px]', tagLabelClass(tag))}>
                              {tag}
                            </Badge>
                          ))}
                          {!c.tags?.length ? (
                            <Badge variant="outline" className={cn('rounded-full text-[11px]', designationLabelClass(c.type))}>
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
