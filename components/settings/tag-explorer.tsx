'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowDownAZ, Check, Copy, ExternalLink, FileText, Hash, ListFilter, Search, Tags, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  sourceItems: TagSourceItem[];
};

type TagSourceItem = {
  id: string;
  title: string;
  filename: string;
};

type CleanupVariantGroup = {
  key: string;
  label: string;
  count: number;
  tags: TagMetric[];
  variants: string[];
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
  variants: 'Similar',
};

function singularizeToken(token: string) {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && /(?:xes|ches|shes|sses|zes)$/.test(token)) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !/(?:ss|us|is)$/.test(token)) return token.slice(0, -1);
  return token;
}

function cleanupKeyForTag(tag: TagMetric) {
  return tag.normalized
    .replace(/&|\+/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(singularizeToken)
    .join(' ');
}

function buildCleanupVariantGroups(tags: TagMetric[]): CleanupVariantGroup[] {
  const groups = new Map<string, TagMetric[]>();

  for (const tag of tags) {
    const key = cleanupKeyForTag(tag);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) || []), tag]);
  }

  return Array.from(groups.entries())
    .map(([key, groupTags]) => {
      const sortedTags = [...groupTags].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
      const variants = Array.from(new Set(sortedTags.flatMap((tag) => tag.variants.length ? tag.variants : [tag.tag])))
        .sort((a, b) => a.localeCompare(b));

      return {
        key,
        label: sortedTags[0]?.tag || key,
        count: sortedTags.reduce((sum, tag) => sum + tag.count, 0),
        tags: sortedTags,
        variants,
      };
    })
    .filter((group) => group.tags.length > 1 || group.tags.some((tag) => tag.hasCaseVariants))
    .sort((a, b) => b.tags.length - a.tags.length || b.count - a.count || a.label.localeCompare(b.label));
}

export default function TagExplorer() {
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('count-desc');
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [inUseTag, setInUseTag] = useState<TagMetric | null>(null);
  const { data, error, isLoading } = useSWR<TagExplorerResponse>('/api/source-content/tags', fetcher);

  const tags = useMemo(() => data?.tags || [], [data?.tags]);
  const maxCount = Math.max(...tags.map((tag) => tag.count), 1);
  const singleUseTags = useMemo(
    () => tags.filter((tag) => tag.count === 1).sort((a, b) => a.tag.localeCompare(b.tag)),
    [tags]
  );
  const variantGroups = useMemo(() => buildCleanupVariantGroups(tags), [tags]);
  const variantGroupTagKeys = useMemo(
    () => new Set(variantGroups.flatMap((group) => group.tags.map((tag) => tag.normalized))),
    [variantGroups]
  );
  const variantTagCount = useMemo(
    () => variantGroups.reduce((sum, group) => sum + group.tags.length, 0),
    [variantGroups]
  );
  const cleanupChecks = singleUseTags.length + variantGroups.length;

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
      next = next.filter((tag) => variantGroupTagKeys.has(tag.normalized)).sort((a, b) => a.tag.localeCompare(b.tag));
    } else {
      next.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    }

    return next;
  }, [query, sortMode, tags, variantGroupTagKeys]);

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
            <button
              type="button"
              aria-label="Open cleanup check details"
              onClick={() => setCleanupOpen(true)}
              className="rounded-md text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <MetricCard icon={TriangleAlert} label="Cleanup checks" value={cleanupChecks} detail="single-use + similar groups" />
            </button>
          </div>
        </div>
      </section>

      <CleanupDialog
        open={cleanupOpen}
        onOpenChange={setCleanupOpen}
        singleUseTags={singleUseTags}
        variantGroups={variantGroups}
        variantTagCount={variantTagCount}
        onFilter={(mode) => {
          setSortMode(mode);
          setQuery('');
          setCleanupOpen(false);
        }}
      />
      <TagInUseDialog
        tag={inUseTag}
        open={Boolean(inUseTag)}
        onOpenChange={(open) => {
          if (!open) setInUseTag(null);
        }}
      />

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
            <UseCase title="Cleanup" detail="Find one-off tags and similar labels that should be reviewed for merging later." />
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
          <div className="grid grid-cols-[1fr_72px_84px_84px] bg-secondary/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid-cols-[1fr_120px_160px_130px_130px]">
            <div>Tag</div>
            <div className="text-right">Uses</div>
            <div className="hidden md:block">Health</div>
            <div className="text-right">In Use List</div>
            <div className="text-right">Open</div>
          </div>
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading tag metrics...</div>
          ) : filteredTags.length ? (
            filteredTags.map((tag) => (
              <div key={tag.normalized} className="grid grid-cols-[1fr_72px_84px_84px] items-center gap-3 border-t border-border px-3 py-3 text-sm md:grid-cols-[1fr_120px_160px_130px_130px]">
                <div className="min-w-0">
                  <Badge variant="outline" className={cn('max-w-full truncate text-xs font-medium', tagLabelClass(tag.tag))}>
                    {tag.tag}
                  </Badge>
                  {tag.hasCaseVariants ? (
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      Variants: {tag.variants.join(', ')}
                    </div>
                  ) : variantGroupTagKeys.has(tag.normalized) ? (
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      Similar tag group candidate
                    </div>
                  ) : null}
                </div>
                <div className="text-right font-semibold tabular-nums">{tag.count}</div>
                <div className="hidden md:block">
                  <span className={cn(
                    'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                    variantGroupTagKeys.has(tag.normalized)
                      ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-200'
                      : tag.count === 1
                        ? 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-500/35 dark:bg-slate-500/15 dark:text-slate-200'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-200'
                  )}>
                    {variantGroupTagKeys.has(tag.normalized) ? 'Similar review' : tag.count === 1 ? 'Single-use' : 'Active'}
                  </span>
                </div>
                <div className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Open in-use list for ${tag.tag}`}
                    onClick={() => setInUseTag(tag)}
                    className="px-2"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="sr-only">Open in-use list</span>
                  </Button>
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

function TagInUseDialog({
  tag,
  open,
  onOpenChange,
}: {
  tag: TagMetric | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const sourceItems = tag?.sourceItems || [];
  const copyText = sourceItems.map((item) => item.filename).join('\n');

  async function copyFilenames() {
    if (!copyText) return;
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[920px] overflow-hidden p-0">
        <DialogHeader className="border-b border-border bg-card px-6 py-5 pr-12 text-left">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle>In Use List</DialogTitle>
              <DialogDescription className="mt-2 max-w-2xl leading-6">
                {tag ? (
                  <>
                    <span className="font-medium text-foreground">{tag.tag}</span> appears in {sourceItems.length.toLocaleString()} source content {sourceItems.length === 1 ? 'item' : 'items'}.
                  </>
                ) : (
                  'Source content using this tag.'
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Filenames from the source database</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Copy the full list for cleanup, review, or handoff notes.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={copyFilenames} disabled={!sourceItems.length} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : `Copy ${sourceItems.length.toLocaleString()}`}
            </Button>
          </div>

          <div className="mt-4 max-h-[calc(100vh-17rem)] overflow-y-auto rounded-md border border-border">
            {sourceItems.length ? (
              <div className="divide-y divide-border">
                {sourceItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-[48px_1fr] gap-3 px-4 py-3 text-sm">
                    <div className="text-right text-xs font-semibold tabular-nums text-muted-foreground">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.filename}</p>
                      {item.title && item.title !== item.filename ? (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{item.title}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                No source content items were returned for this tag.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CleanupDialog({
  open,
  onOpenChange,
  singleUseTags,
  variantGroups,
  variantTagCount,
  onFilter,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  singleUseTags: TagMetric[];
  variantGroups: CleanupVariantGroup[];
  variantTagCount: number;
  onFilter: (mode: Extract<SortMode, 'single-use' | 'variants'>) => void;
}) {
  const singleUsePreview = singleUseTags.slice(0, 12);
  const variantPreview = variantGroups.slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[1180px] overflow-hidden p-0">
        <DialogHeader className="border-b border-border bg-card px-6 py-5 pr-12 text-left">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <TriangleAlert className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle>Cleanup checks</DialogTitle>
              <DialogDescription className="mt-2 max-w-2xl leading-6">
                Suggested cleanup groups based on tags used once and tags that look like duplicates after punctuation, casing, and simple plural cleanup.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <CleanupSummaryCard
              title="Single-use tags"
              count={singleUseTags.length}
              detail="Tags assigned to exactly one source item. These may be valid niche labels, but they are good candidates for merging into broader planning tags."
              actionLabel="Show single-use tags"
              onAction={() => onFilter('single-use')}
            />
            <CleanupSummaryCard
              title="Similar tag groups"
              count={variantGroups.length}
              detail={`${variantTagCount.toLocaleString()} tags appear in groups that may represent the same idea with different spelling, punctuation, casing, or singular/plural forms.`}
              actionLabel="Show similar groups"
              onAction={() => onFilter('variants')}
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Single-use examples</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Review these before deleting or merging. A one-off tag can still be useful if it marks a specific campaign or recurring content lane.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {singleUsePreview.length ? (
                  singleUsePreview.map((tag) => (
                    <Link key={tag.normalized} href={`/source-content?tags=${encodeURIComponent(tag.tag)}`}>
                      <Badge variant="outline" className={cn('max-w-56 truncate text-xs font-medium', tagLabelClass(tag.tag))}>
                        {tag.tag}
                      </Badge>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No single-use tags found.</p>
                )}
              </div>
              {singleUseTags.length > singleUsePreview.length ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Showing {singleUsePreview.length} of {singleUseTags.length.toLocaleString()} candidates.
                </p>
              ) : null}
            </section>

            <section className="rounded-lg border border-border bg-background p-4">
              <h3 className="text-sm font-semibold">Similar groups to standardize</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Pick one preferred label for each group, then update matching source items to that spelling. These are suggestions, not automatic merges.
              </p>
              <div className="mt-4 space-y-3">
                {variantPreview.length ? (
                  variantPreview.map((group) => (
                    <div key={group.key} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="outline" className={cn('max-w-56 truncate text-xs font-medium', tagLabelClass(group.label))}>
                          {group.label}
                        </Badge>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                          {group.count} uses
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {group.variants.map((variant) => (
                          <span key={variant} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                            {variant}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {group.tags.map((tag) => (
                          <Link key={tag.normalized} href={`/source-content?tags=${encodeURIComponent(tag.tag)}`} className="min-w-0 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary">
                            <span className="block truncate font-medium">{tag.tag}</span>
                            <span className="text-muted-foreground">{tag.count} uses</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No similar tag groups found.</p>
                )}
              </div>
              {variantGroups.length > variantPreview.length ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Showing {variantPreview.length} of {variantGroups.length.toLocaleString()} groups.
                </p>
              ) : null}
            </section>
          </div>

          <div className="mt-5 rounded-lg border border-dashed border-border bg-secondary/40 p-4">
            <h3 className="text-sm font-semibold">Suggested cleanup workflow</h3>
            <div className="mt-3 grid gap-3 text-xs leading-5 text-muted-foreground md:grid-cols-3">
              <p><span className="font-semibold text-foreground">1.</span> Start with similar groups because the intent is usually easier to compare.</p>
              <p><span className="font-semibold text-foreground">2.</span> Review single-use tags and decide whether each belongs as a broader existing tag.</p>
              <p><span className="font-semibold text-foreground">3.</span> Open the tagged source items, update their tags, then refresh Tag Explorer.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CleanupSummaryCard({
  title,
  count,
  detail,
  actionLabel,
  onAction,
}: {
  title: string;
  count: number;
  detail: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-2xl font-semibold tabular-nums">{count.toLocaleString()}</p>
          <h3 className="mt-1 text-sm font-semibold">{title}</h3>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAction} className="w-full justify-center sm:w-auto">
          {actionLabel}
        </Button>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{detail}</p>
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
