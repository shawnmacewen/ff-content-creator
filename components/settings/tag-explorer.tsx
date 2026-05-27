'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowDownAZ, ExternalLink, Hash, ListFilter, Search, Tags, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { tagLabelClass } from '@/lib/content-label-colors';
import { cn } from '@/lib/utils';

type SortMode = 'count-desc' | 'name-asc' | 'single-use' | 'variants';

type TagMetric = {
  tag: string;
  normalized: string;
  count: number;
  variants: string[];
  hasCaseVariants: boolean;
};

type TagExplorerResponse = {
  tags: TagMetric[];
  summary: {
    uniqueTags: number;
    totalTagUses: number;
    taggedContentCount: number;
    singleUseCount: number;
    variantCount: number;
  };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const sortLabels: Record<SortMode, string> = {
  'count-desc': 'Most used',
  'name-asc': 'A-Z',
  'single-use': 'Single-use',
  variants: 'Variants',
};

export default function TagExplorer() {
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('count-desc');
  const { data, error, isLoading } = useSWR<TagExplorerResponse>('/api/source-content/tags', fetcher);

  const tags = useMemo(() => data?.tags || [], [data?.tags]);
  const maxCount = Math.max(...tags.map((tag) => tag.count), 1);

  const filteredTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    let next = q
      ? tags.filter((tag) =>
          tag.tag.toLowerCase().includes(q) ||
          tag.normalized.includes(q) ||
          tag.variants.some((variant) => variant.toLowerCase().includes(q))
        )
      : [...tags];

    if (sortMode === 'name-asc') {
      next.sort((a, b) => a.tag.localeCompare(b.tag));
    } else if (sortMode === 'single-use') {
      next = next.filter((tag) => tag.count === 1).sort((a, b) => a.tag.localeCompare(b.tag));
    } else if (sortMode === 'variants') {
      next = next.filter((tag) => tag.hasCaseVariants).sort((a, b) => b.variants.length - a.variants.length || a.tag.localeCompare(b.tag));
    } else {
      next.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    }

    return next;
  }, [query, sortMode, tags]);

  const topTags = tags.slice(0, 8);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-[linear-gradient(135deg,#11285a_0%,#143a7b_58%,#0f6f8f_100%)] p-6 text-white sm:p-7">
            <Badge className="mb-4 border-white/20 bg-white/10 text-white hover:bg-white/10">
              Content metadata
            </Badge>
            <h2 className="text-2xl font-semibold leading-tight">Tag Explorer</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50/85">
              Review tag coverage, spot cleanup candidates, and open tagged source content for editorial planning.
            </p>
          </div>
          <div className="grid gap-3 bg-secondary/60 p-6 sm:grid-cols-2 sm:p-7">
            <MetricCard icon={Tags} label="Unique tags" value={data?.summary?.uniqueTags ?? 0} detail="distinct normalized labels" />
            <MetricCard icon={Hash} label="Tag uses" value={data?.summary?.totalTagUses ?? 0} detail="total assignments" />
            <MetricCard icon={ListFilter} label="Tagged items" value={data?.summary?.taggedContentCount ?? 0} detail="content with at least one tag" />
            <MetricCard icon={TriangleAlert} label="Cleanup checks" value={(data?.summary?.singleUseCount ?? 0) + (data?.summary?.variantCount ?? 0)} detail="single-use + variant groups" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Most Used</p>
              <h3 className="text-lg font-semibold">Top tags</h3>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/source-content">
                Source Content
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="h-48 rounded-md bg-muted animate-pulse" />
            ) : topTags.length ? (
              topTags.map((tag) => (
                <TagBar key={tag.normalized} tag={tag} maxCount={maxCount} />
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No tags found.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-primary">Editorial Uses</p>
          <h3 className="text-lg font-semibold">What this helps with</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <UseCase title="Planning coverage" detail="See which topics are well-covered before assigning new content." />
            <UseCase title="Cleanup" detail="Find one-off tags and casing variants that should be merged later." />
            <UseCase title="Source selection" detail="Jump from any tag into the Source Content library for review." />
            <UseCase title="Future governance" detail="This can become the basis for approved tags, aliases, and tag-owner workflows." />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Inventory</p>
            <h3 className="text-lg font-semibold">All tags</h3>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tags"
                className="w-full pl-9 sm:w-64"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(sortLabels) as SortMode[]).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  variant={sortMode === mode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortMode(mode)}
                  className="gap-1.5"
                >
                  {mode === 'name-asc' ? <ArrowDownAZ className="h-3.5 w-3.5" /> : null}
                  {sortLabels[mode]}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load tag metrics.
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[1fr_90px_110px] bg-secondary/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid-cols-[1fr_120px_160px_130px]">
            <div>Tag</div>
            <div className="text-right">Uses</div>
            <div className="hidden md:block">Health</div>
            <div className="text-right">Open</div>
          </div>
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading tag metrics...</div>
          ) : filteredTags.length ? (
            filteredTags.map((tag) => (
              <div key={tag.normalized} className="grid grid-cols-[1fr_90px_110px] items-center gap-3 border-t border-border px-3 py-3 text-sm md:grid-cols-[1fr_120px_160px_130px]">
                <div className="min-w-0">
                  <Badge variant="outline" className={cn('max-w-full truncate text-xs font-medium', tagLabelClass(tag.tag))}>
                    {tag.tag}
                  </Badge>
                  {tag.hasCaseVariants ? (
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      Variants: {tag.variants.join(', ')}
                    </div>
                  ) : null}
                </div>
                <div className="text-right font-semibold tabular-nums">{tag.count}</div>
                <div className="hidden md:block">
                  <span className={cn(
                    'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                    tag.hasCaseVariants
                      ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-200'
                      : tag.count === 1
                        ? 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-500/35 dark:bg-slate-500/15 dark:text-slate-200'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-200'
                  )}>
                    {tag.hasCaseVariants ? 'Variant review' : tag.count === 1 ? 'Single-use' : 'Active'}
                  </span>
                </div>
                <div className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/source-content?tags=${encodeURIComponent(tag.tag)}`}>
                      View
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-muted-foreground">No tags match the current filters.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof Tags; label: string; value: number; detail: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-lg font-semibold tabular-nums">{value.toLocaleString()}</p>
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function TagBar({ tag, maxCount }: { tag: TagMetric; maxCount: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <Badge variant="outline" className={cn('truncate text-xs font-medium', tagLabelClass(tag.tag))}>
          {tag.tag}
        </Badge>
        <span className="text-xs font-semibold tabular-nums">{tag.count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (tag.count / maxCount) * 100)}%` }} />
      </div>
    </div>
  );
}

function UseCase({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</div>
    </div>
  );
}
