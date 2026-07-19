'use client';

import * as React from 'react';
import useSWRInfinite from 'swr/infinite';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { designationLabelClass } from '@/lib/content-label-colors';
import { cn } from '@/lib/utils';
import type { SourceContent } from '@/lib/types/content';
import { getSourceContentDesignation } from '@/lib/source-content/designation';
import { buildSourceContentSearchText, sourceContentMatchesQuery } from '@/lib/source-content/search';
import { Calendar, Check, ChevronDown, FileText, Filter, Search, Sparkles } from 'lucide-react';

type Topic = 'All Topics' | 'Markets' | 'Economy' | 'Energy' | 'AI & Tech' | 'Banking' | 'Medicare' | 'Geopolitics' | 'ESG';

const TOPICS: Topic[] = ['All Topics', 'Markets', 'Economy', 'AI & Tech', 'Banking', 'Medicare', 'Energy', 'Geopolitics', 'ESG'];

const TOPIC_NEEDLES: Record<Topic, string[]> = {
  'All Topics': [],
  Markets: ['markets', 'market', 'stocks', 'equities', 'bonds', 'fixed income'],
  Economy: ['economy', 'economic', 'inflation', 'gdp', 'jobs', 'labor'],
  Energy: ['energy', 'oil', 'crude', 'petroleum', 'gas', 'opec'],
  'AI & Tech': ['ai', 'tech', 'technology', 'crypto', 'digital assets', 'blockchain'],
  Banking: ['bank', 'banking', 'credit', 'lending', 'rates'],
  Medicare: ['medicare', 'social security', 'healthcare', 'health care'],
  Geopolitics: ['geopolitics', 'war', 'conflict', 'sanctions', 'election'],
  ESG: ['esg', 'sustainable', 'sustainability', 'responsible', 'impact', 'investing'],
};

interface ApiResponse {
  data: SourceContent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const SOURCE_ARTICLE_PAGE_SIZE = 50;

function formatDate(s?: string) {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

function decodeLite(s: string) {
  return String(s || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function parseMetadata(c: SourceContent) {
  const meta = c?.metadata;
  if (typeof meta !== 'string') return meta || null;
  try {
    return JSON.parse(meta);
  } catch {
    return null;
  }
}

function fromExtraPropertiesArray(meta: any, key: string): string | undefined {
  const arr = meta?.raw?.extra_properties;
  if (!Array.isArray(arr)) return undefined;
  const hit = arr.find((x: any) => String(x?.key || '') === key);
  const v = hit?.stringValue ?? hit?.value ?? hit?.string_value;
  return typeof v === 'string' ? v : undefined;
}

function getThumb(c: SourceContent) {
  const meta = parseMetadata(c);
  const extraMap: any = meta?.extraProperties || meta?.raw?.extraProperties || null;

  return (
    (extraMap?.['SocialMediaPlatformImages.Twitter'] as string | undefined) ||
    (meta?.['SocialMediaPlatformImages.Twitter'] as string | undefined) ||
    fromExtraPropertiesArray(meta, 'SocialMediaPlatformImages.Twitter') ||
    (meta?.SocialMediaPlatformImages?.Twitter as string | undefined) ||
    (meta?.SocialMediaPlatformImages?.twitter as string | undefined) ||
    (meta?.socialMediaPlatformImages?.Twitter as string | undefined) ||
    (meta?.socialMediaPlatformImages?.twitter as string | undefined) ||
    (extraMap?.['SocialMediaPlatformImages.X'] as string | undefined) ||
    (meta?.['SocialMediaPlatformImages.X'] as string | undefined) ||
    fromExtraPropertiesArray(meta, 'SocialMediaPlatformImages.X') ||
    (meta?.SocialMediaPlatformImages?.X as string | undefined) ||
    (meta?.SocialMediaPlatformImages?.x as string | undefined) ||
    (meta?.socialMediaPlatformImages?.X as string | undefined) ||
    (meta?.socialMediaPlatformImages?.x as string | undefined) ||
    (extraMap?.['SocialMediaPlatformImages.LinkedIn'] as string | undefined) ||
    (meta?.['SocialMediaPlatformImages.LinkedIn'] as string | undefined) ||
    fromExtraPropertiesArray(meta, 'SocialMediaPlatformImages.LinkedIn') ||
    (meta?.SocialMediaPlatformImages?.LinkedIn as string | undefined) ||
    (meta?.SocialMediaPlatformImages?.linkedIn as string | undefined) ||
    (meta?.SocialMediaPlatformImages?.linkedin as string | undefined) ||
    (meta?.socialMediaPlatformImages?.LinkedIn as string | undefined) ||
    (meta?.socialMediaPlatformImages?.linkedIn as string | undefined) ||
    (meta?.socialMediaPlatformImages?.linkedin as string | undefined) ||
    (extraMap?.['SocialMediaPlatformImages.Thumbnail'] as string | undefined) ||
    (meta?.['SocialMediaPlatformImages.Thumbnail'] as string | undefined) ||
    fromExtraPropertiesArray(meta, 'SocialMediaPlatformImages.Thumbnail') ||
    (meta?.SocialMediaPlatformImages?.Thumbnail as string | undefined) ||
    (meta?.SocialMediaPlatformImages?.thumbnail as string | undefined) ||
    (meta?.socialMediaPlatformImages?.Thumbnail as string | undefined) ||
    (meta?.socialMediaPlatformImages?.thumbnail as string | undefined) ||
    (c?.imageUrl as string | undefined) ||
    null
  );
}

function getFilename(c: SourceContent) {
  const meta = parseMetadata(c);
  const extraMap: any = meta?.extraProperties || meta?.raw?.extraProperties || null;
  const selected: any = meta?.extraPropertiesSelected || null;
  return (
    (c as any)?.metadata?.extraPropertiesSelected?.BasContentFilename ||
    selected?.BasContentFilename ||
    extraMap?.BasContentFilename ||
    (c as any)?.externalId ||
    null
  );
}

function takeawayStatusClass(status?: string) {
  if (status === 'ready') return 'text-emerald-700';
  if (status === 'skipped_short_body') return 'text-amber-700';
  if (status === 'failed') return 'text-red-700';
  return 'text-slate-400';
}

export function SourceArticlePicker({
  selectedId,
  onSelect,
  compact = false,
  splitView = false,
  className,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  compact?: boolean;
  splitView?: boolean;
  className?: string;
}) {
  const [query, setQuery] = React.useState('');
  const [topic, setTopic] = React.useState<Topic>('All Topics');
  const [autoLoadAll, setAutoLoadAll] = React.useState(false);
  const [showTopicFilters, setShowTopicFilters] = React.useState(false);

  const getPageKey = React.useCallback((pageIndex: number, previousPageData: ApiResponse | null) => {
    if (previousPageData && !previousPageData.hasNextPage) return null;

    const params = new URLSearchParams({
      page: String(pageIndex + 1),
      pageSize: String(SOURCE_ARTICLE_PAGE_SIZE),
    });

    return `/api/source-content?${params.toString()}`;
  }, []);

  const {
    data: pages,
    isLoading,
    isValidating,
    size,
    setSize,
  } = useSWRInfinite<ApiResponse>(getPageKey, fetcher, {
    keepPreviousData: true,
    revalidateFirstPage: false,
  });

  const items = React.useMemo(() => pages?.flatMap((page) => page.data || []) ?? [], [pages]);
  const latestPage = pages?.[pages.length - 1] ?? null;
  const total = latestPage?.total ?? pages?.[0]?.total ?? 0;
  const hasNextPage = Boolean(latestPage?.hasNextPage);
  const loadedCount = items.length;
  const isLoadingMore = isValidating && Boolean(pages?.length);
  const loadProgressPercent = total ? Math.min(100, Math.round((loadedCount / total) * 100)) : 0;
  const loadProgressWidth = total ? `${Math.max(loadedCount ? 4 : 0, loadProgressPercent)}%` : isLoadingMore ? '8%' : '0%';

  React.useEffect(() => {
    if (!autoLoadAll || !hasNextPage || isValidating) return;
    void setSize(size + 1);
  }, [autoLoadAll, hasNextPage, isValidating, setSize, size]);

  React.useEffect(() => {
    if (autoLoadAll && !hasNextPage && !isValidating) setAutoLoadAll(false);
  }, [autoLoadAll, hasNextPage, isValidating]);

  const topicCounts = React.useMemo(() => {
    return Object.fromEntries(
      TOPICS.map((topicName) => {
        const needles = topicName === 'All Topics' ? [] : (TOPIC_NEEDLES[topicName] || [topicName]).map((s) => s.toLowerCase());
        const count = needles.length
          ? items.filter((c) => {
              const hay = buildSourceContentSearchText(c).toLowerCase();
              return needles.some((needle) => hay.includes(needle));
            }).length
          : items.length;
        return [topicName, count];
      })
    ) as Record<Topic, number>;
  }, [items]);

  const filtered = React.useMemo(() => {
    const needles = topic === 'All Topics' ? [] : (TOPIC_NEEDLES[topic] || [topic]).map((s) => s.toLowerCase());
    const q = query.trim();

    return items.filter((c) => {
      const hay = buildSourceContentSearchText(c).toLowerCase();

      const topicOk = !needles.length || needles.some((n) => hay.includes(n));
      const searchOk = sourceContentMatchesQuery(c, q);
      return topicOk && searchOk;
    });
  }, [items, topic, query]);

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
                  const thumb = getThumb(c);

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
    <Card className={cn(
      splitView
        ? 'flex h-full min-h-0 flex-col gap-0 overflow-hidden rounded-lg border-0 bg-transparent shadow-none'
        : 'overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-[0_24px_80px_rgba(15,23,42,0.10)]',
      className
    )}>
      <CardHeader className={cn('space-y-5 px-5 pb-4 pt-5 sm:px-6', splitView && 'space-y-2 px-3 py-2.5 sm:px-3')}>
        {splitView ? null : (
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/60 bg-cyan-50/80 px-3 py-1 text-xs font-semibold text-cyan-800">
              <Sparkles className="h-3.5 w-3.5" />
              Editorial Sources
            </div>
            <div className="mt-3 text-xl font-semibold tracking-normal text-slate-950">Choose the source article</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Select an article to preview and use it as generation context.
            </p>
          </div>
        )}

        <div className={cn('grid gap-2 lg:grid-cols-[auto_minmax(170px,1fr)_auto] lg:items-center', splitView && 'gap-2')}>
          <div className="flex flex-wrap items-center gap-1.5">
            {splitView ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/60 bg-cyan-50/80 px-2.5 py-1 text-[11px] font-semibold text-cyan-800">
                <Sparkles className="h-3 w-3" />
                Editorial Sources
              </div>
            ) : null}
            <div className={cn('flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm', splitView && 'gap-1.5 px-2.5 py-1 text-[11px]')}>
              <FileText className={cn('h-4 w-4 text-slate-400', splitView && 'h-3.5 w-3.5')} />
              {isLoading
                ? 'Loading sources'
                  : query.trim()
                  ? `${filtered.length.toLocaleString()} search results`
                : `${filtered.length.toLocaleString()} shown`}
            </div>
          </div>
          <div className={cn('flex min-w-0 items-center gap-2', !splitView && 'lg:max-w-md')}>
            <div className="h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all"
                style={{ width: loadProgressWidth }}
              />
            </div>
            <span className="w-10 text-right text-[11px] font-bold text-cyan-700">
              {total ? `${loadProgressPercent}%` : '--'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
            {splitView && hasNextPage ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg border-slate-200 bg-white/80 px-2.5 text-xs shadow-sm"
                  disabled={isLoadingMore}
                  onClick={() => void setSize(size + 1)}
                >
                  {isLoadingMore ? 'Loading...' : `Load ${SOURCE_ARTICLE_PAGE_SIZE} more`}
                </Button>
                <Button
                  type="button"
                  variant={autoLoadAll ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 rounded-lg px-2.5 text-xs shadow-sm"
                  disabled={isLoadingMore && !autoLoadAll}
                  onClick={() => setAutoLoadAll((value) => !value)}
                >
                  {autoLoadAll ? 'Stop full load' : 'Load full library'}
                </Button>
              </>
            ) : splitView && loadedCount ? (
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">All loaded</span>
            ) : null}
          </div>
        </div>

        <div className={cn('flex flex-col gap-3 xl:flex-row xl:items-center', splitView && 'gap-2')}>
          <div className="relative flex-1">
            <Search className={cn('absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400', splitView && 'left-3 h-3.5 w-3.5')} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, topic, keyword, or tag..."
              className={cn('h-12 rounded-2xl border-slate-200 bg-white/82 pl-11 text-sm shadow-sm placeholder:text-slate-400 focus-visible:ring-cyan-200', splitView && 'h-9 rounded-lg pl-8 text-xs')}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center lg:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTopicFilters((value) => !value)}
              className={cn(
                'h-12 justify-center gap-2 rounded-2xl border-slate-200 bg-white/78 px-4 text-slate-700 shadow-sm',
                splitView && 'h-9 rounded-lg px-3 text-xs',
                showTopicFilters && 'border-blue-200 bg-blue-50 text-blue-700'
              )}
            >
              <Filter className={cn('h-4 w-4', splitView && 'h-3.5 w-3.5')} />
              Filter
            </Button>
            <Button type="button" variant="outline" className={cn('h-12 justify-center gap-2 rounded-2xl border-slate-200 bg-white/78 px-4 text-slate-700 shadow-sm', splitView && 'h-9 rounded-lg px-3 text-xs')}>
              Newest First
              <ChevronDown className={cn('h-4 w-4', splitView && 'h-3.5 w-3.5')} />
            </Button>
          </div>
        </div>

        {showTopicFilters ? (
        <div className={cn('flex gap-2 overflow-x-auto pb-1', splitView && 'flex-wrap gap-1 overflow-visible pb-0')}>
          {TOPICS.filter((t) => t !== 'All Topics').map((t) => {
            const active = t === topic;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(active ? 'All Topics' : t)}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors',
                  splitView && 'px-2.5 py-1 text-[11px]',
                  active
                    ? 'border-slate-950 bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.20)]'
                    : 'border-slate-200 bg-white/78 text-slate-500 hover:border-cyan-200 hover:text-slate-900'
                )}
              >
                <span>{t}</span>
                <span className={cn('ml-1 rounded-full px-1.5 py-0.5 text-[10px]', active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500')}>
                  {topicCounts[t] || 0}
                </span>
              </button>
            );
          })}
        </div>
        ) : null}
      </CardHeader>

      <CardContent className={cn('px-5 pb-5 sm:px-6', splitView && 'flex min-h-0 flex-1 flex-col px-3 pb-2.5 sm:px-3')}>
        <ScrollArea className={cn('overflow-hidden rounded-[1.25rem]', splitView ? 'h-full min-h-0 flex-1' : 'h-[560px]')}>
          {isLoading ? (
            <div className={cn('grid gap-4 pr-3 pb-4', splitView && 'gap-2 pr-2', !splitView && 'lg:grid-cols-2')}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={cn('rounded-[1.25rem] bg-slate-200/70 animate-pulse', splitView ? 'h-24' : 'h-44')} />
              ))}
            </div>
          ) : (
            <div className={cn('grid gap-4 pr-3 pb-4', splitView && 'gap-2 pr-2', !splitView && 'lg:grid-cols-2')}>
              {filtered.length === 0 ? (
                <div className="lg:col-span-2 rounded-[1.5rem] border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm text-slate-500">
                  No articles found.
                </div>
              ) : null}

              {filtered.map((c) => {
                const selected = selectedId === c.id;
                const thumb = getThumb(c);
                const words = c.body ? c.body.split(/\s+/).filter(Boolean).length : 0;
                const primaryLabel = decodeLite(getSourceContentDesignation(c));
                const filename = getFilename(c);
                const signalCount = Array.isArray(c.contentSignals) ? c.contentSignals.length : 0;
                const takeawayStatus = c.takeawayStatus;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelect(selected ? null : c.id)}
                    className={cn(
                      'group relative overflow-hidden rounded-[1.25rem] border bg-white text-left shadow-[0_18px_50px_rgba(15,23,42,0.10)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.16)]',
                      splitView ? 'min-h-[76px] rounded-lg shadow-none hover:translate-y-0 hover:shadow-sm' : 'min-h-44',
                      selected
                        ? splitView
                          ? 'border-primary bg-blue-50/80 ring-1 ring-primary/25'
                          : 'border-primary ring-2 ring-primary/25'
                        : 'border-slate-200/80'
                    )}
                  >
                    {splitView && selected ? <div className="absolute inset-y-0 left-0 w-1 bg-primary" /> : null}
                    <div className={cn('absolute inset-y-0 left-0 overflow-hidden bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.96),rgba(255,255,255,0)_34%),linear-gradient(135deg,#eff6ff_0%,#bfdbfe_45%,#f8fafc_100%)]', splitView ? 'ml-1 w-[148px]' : 'w-[36%]')}>
                      {thumb ? (
                        <div
                          className="h-full w-full bg-cover bg-center transition duration-700 group-hover:scale-105"
                          style={{ backgroundImage: `url("${String(thumb).trim().replace(/"/g, '\\"')}")` }}
                        />
                      ) : (
                        <div className="h-full w-full bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.96),rgba(255,255,255,0)_34%),linear-gradient(135deg,#eff6ff_0%,#bfdbfe_45%,#f8fafc_100%)]" />
                      )}
                      {splitView ? null : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/20 via-transparent to-white/45" />
                          <div className="absolute inset-y-0 -right-px w-14 bg-gradient-to-r from-transparent via-white/82 to-white" />
                        </>
                      )}
                    </div>

                    <div className={cn('relative flex flex-col p-4 sm:p-5', splitView ? 'ml-[158px] min-h-[76px] py-2 pl-3 pr-11 sm:py-2 sm:pl-3 sm:pr-11' : 'ml-[40%] min-h-44')}>
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className={cn('max-w-[180px] truncate rounded-full bg-white/82 text-[11px] font-semibold', splitView && 'max-w-[180px] px-2 py-0 text-[10px]', designationLabelClass(primaryLabel))}>
                          {primaryLabel}
                        </Badge>
                        <span
                          className={cn(
                            'flex shrink-0 items-center justify-center rounded-full border shadow-sm',
                            splitView ? 'absolute right-3 top-1/2 h-6 w-6 -translate-y-1/2' : 'h-8 w-8',
                            selected ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white/90 text-transparent'
                          )}
                          aria-hidden
                        >
                          <Check className={cn('h-4 w-4', splitView && 'h-3.5 w-3.5')} />
                        </span>
                      </div>

                      <div className={cn('min-w-0 flex-1', splitView ? 'mt-1.5' : 'mt-4')}>
                        <div className={cn('line-clamp-2 font-semibold leading-snug text-slate-950', splitView ? 'text-[13px]' : 'text-base')}>
                          {decodeLite(c.title || 'Untitled article')}
                        </div>
                        <div className={cn('mt-2 line-clamp-2 leading-6 text-slate-500', splitView ? 'mt-0.5 line-clamp-1 text-[11px] leading-4' : 'text-sm')}>
                          {decodeLite(c.excerpt || 'Open the article preview to review source details and full body content.')}
                        </div>
                      </div>

                      <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500', splitView ? 'mt-1.5 gap-x-2 text-[10px]' : 'mt-4')}>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className={cn('h-3.5 w-3.5', splitView && 'h-3 w-3')} />
                          {formatDate(c.publishedAt) || 'Date unavailable'}
                        </span>
                        {filename ? <span className={cn('max-w-[180px] truncate text-slate-400', splitView && 'max-w-[160px]')}>{decodeLite(filename)}</span> : null}
                        {!splitView && words ? <span>{words.toLocaleString()} words</span> : null}
                        {takeawayStatus?.label ? <span className={takeawayStatusClass(takeawayStatus.status)}>{takeawayStatus.label}</span> : null}
                        {signalCount ? <span>{signalCount} signals</span> : (c.tags || []).length > 1 ? <span>{(c.tags || []).length} tags</span> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className={cn('mt-3 flex flex-col gap-2 border-t border-slate-200/80 pt-3 text-xs font-medium text-slate-500', splitView && 'text-[11px]')}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {selectedId ? '1 article selected for generation context.' : `Loaded ${loadedCount.toLocaleString()}${total ? ` of ${total.toLocaleString()}` : ''} sources.`}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {selectedId ? (
                <button type="button" onClick={() => onSelect(null)} className="w-fit rounded-full px-2 py-1 text-cyan-700 transition hover:bg-cyan-50">
                  Clear selection
                </button>
              ) : null}
              {hasNextPage && !splitView ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-md text-xs"
                    disabled={isLoadingMore}
                    onClick={() => void setSize(size + 1)}
                  >
                    {isLoadingMore ? 'Loading...' : `Load ${SOURCE_ARTICLE_PAGE_SIZE} more`}
                  </Button>
                  <Button
                    type="button"
                    variant={autoLoadAll ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 rounded-md text-xs"
                    disabled={isLoadingMore && !autoLoadAll}
                    onClick={() => setAutoLoadAll((value) => !value)}
                  >
                    {autoLoadAll ? 'Stop full load' : 'Load full library'}
                  </Button>
                </>
              ) : loadedCount && !splitView ? (
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">All loaded</span>
              ) : null}
            </div>
          </div>
          {autoLoadAll ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: total ? `${Math.max(4, Math.min(100, Math.round((loadedCount / total) * 100)))}%` : '8%' }}
              />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
