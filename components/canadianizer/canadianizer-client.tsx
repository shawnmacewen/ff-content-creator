'use client';

import * as React from 'react';
import useSWR from 'swr';
import {
  BadgeCheck,
  Check,
  FileText,
  Flag,
  Info,
  Leaf,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { designationLabelClass, tagLabelClass } from '@/lib/content-label-colors';
import type { SourceContent } from '@/lib/types/content';
import { cn } from '@/lib/utils';

type SourceContentResponse = {
  data: SourceContent[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage?: boolean;
};

type CanadianizedResult = {
  canadianTitle: string;
  canadianArticleMarkdown: string;
  executiveSummary: string;
  matchScore: number;
  matchScoreLabel: 'Strong match' | 'Good match' | 'Partial match' | 'Low match';
  scoreRationale: string;
  equivalentMap: Array<{
    americanConcept: string;
    canadianEquivalent: string;
    confidence: 'high' | 'medium' | 'low';
    notes: string;
  }>;
  gapsAndNonMatches: string[];
  editorialNotes: string[];
  complianceNotes: string[];
  source: {
    id: string;
    title: string;
    publisher?: string | null;
    publishedAt?: string | null;
    contentDesignation?: string | null;
    tags?: string[];
  };
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed with status ${response.status}`);
  return body;
};

function decodeLite(value: string) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function formatDate(value?: string | null) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

function getContentDesignation(source: SourceContent) {
  const designation = source.metadata?.contentDesignation || source.type || 'Editorial Source';
  return decodeLite(String(designation));
}

function getSourceBody(source: SourceContent) {
  return source.bodyText || source.body || source.excerpt || '';
}

function getSourceCategories(source: SourceContent) {
  const meta = source.metadata || {};
  const categories = [
    ...(Array.isArray(meta.categories) ? meta.categories : []),
    ...(Array.isArray(meta.subCategories) ? meta.subCategories : []),
    ...(source.tags || []),
  ];
  return Array.from(new Set(categories.map((item) => decodeLite(String(item))).filter(Boolean))).slice(0, 6);
}

function buildApiUrl(query: string, page: number) {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  params.set('page', String(page));
  params.set('pageSize', '12');
  return `/api/source-content?${params.toString()}`;
}

function scoreClass(score: number) {
  if (score >= 85) return 'text-emerald-700';
  if (score >= 70) return 'text-blue-700';
  if (score >= 45) return 'text-amber-700';
  return 'text-destructive';
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="space-y-3 text-sm leading-7">
      {content.split(/\n{2,}/).map((block, index) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('# ')) {
          return <h2 key={index} className="text-xl font-semibold leading-7">{trimmed.replace(/^#\s+/, '')}</h2>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={index} className="pt-2 text-base font-semibold">{trimmed.replace(/^##\s+/, '')}</h3>;
        }
        if (trimmed.startsWith('- ')) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5 text-muted-foreground">
              {trimmed.split('\n').map((item) => <li key={item}>{item.replace(/^-\s+/, '')}</li>)}
            </ul>
          );
        }
        return <p key={index} className="text-muted-foreground">{trimmed}</p>;
      })}
    </div>
  );
}

export default function CanadianizerClient() {
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selectedSource, setSelectedSource] = React.useState<SourceContent | null>(null);
  const [audience, setAudience] = React.useState('Canadian financial advisors and their clients');
  const [province, setProvince] = React.useState('Canada-wide');
  const [tone, setTone] = React.useState('Editorial, clear, engaging');
  const [length, setLength] = React.useState('similar');
  const [includeDisclosure, setIncludeDisclosure] = React.useState(true);
  const [extremeMode, setExtremeMode] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<CanadianizedResult | null>(null);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data, error: sourceError, isLoading } = useSWR<SourceContentResponse>(
    buildApiUrl(debouncedQuery, page),
    fetcher,
    { keepPreviousData: true, shouldRetryOnError: false }
  );

  const sources = React.useMemo(() => data?.data || [], [data?.data]);

  const selectSource = async (source: SourceContent) => {
    setError(null);
    setResult(null);
    setSelectedSource(source);
    try {
      const response = await fetch(`/api/source-content/${source.id}`);
      if (!response.ok) return;
      const detail = await response.json();
      if (detail?.id === source.id) setSelectedSource(detail);
    } catch {
      // Keep the lightweight list item selected if the detail request fails.
    }
  };

  const runCanadianizer = async () => {
    if (!selectedSource || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/canadianizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceContentId: selectedSource.id,
          audience,
          province,
          tone,
          length,
          includeDisclosure,
          mode: extremeMode ? 'extreme' : 'normal',
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Canadianizer failed with status ${response.status}`);
      setResult(payload?.canadianized || null);
    } catch (requestError: any) {
      setError(requestError?.message || 'Failed to Canadianize source content.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="space-y-5 p-4 sm:p-6">
      <PageHeader
        eyebrow="Canadianizer Eh?"
        title="Convert U.S. source content into a Canadian editorial draft"
        description="Select one source article, configure the Canadian lens, and generate a side-by-side adaptation with an equivalency score."
        metrics={[
          {
            label: 'One source article',
            detail: selectedSource ? decodeLite(selectedSource.title || 'Selected content') : 'Choose a U.S. baseline article',
            icon: FileText,
          },
          {
            label: 'Canadian equivalency',
            detail: extremeMode ? 'Extreme mode adds intentionally over-Canadian comic styling' : 'Tax, plan, savings, and market concepts are converted when a reasonable Canadian match exists',
            icon: extremeMode ? Leaf : Flag,
            iconClassName: 'bg-red-600 text-white',
          },
          {
            label: 'Match score',
            detail: result ? `${result.matchScore}% ${result.matchScoreLabel}` : 'Explains where the adaptation is strong or weak',
            icon: BadgeCheck,
            iconClassName: 'bg-emerald-600 text-white',
          },
        ]}
        actions={
          <Button type="button" disabled={!selectedSource || isGenerating} onClick={runCanadianizer} className="gap-2">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isGenerating ? 'Canadianizing' : 'Canadianize'}
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
        <section className="space-y-4">
          <Card>
            <CardHeader className="space-y-4 border-b border-border">
              <div>
                <CardTitle className="text-base">Select Content</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Search source content, then pick one baseline article to adapt.</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by topic, title, keyword, or tag..."
                  className="h-11 pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {sourceError ? <div className="p-4 text-sm text-destructive">{sourceError.message}</div> : null}
              <ScrollArea className="h-[520px]">
                <div className="grid gap-3 p-4">
                  {isLoading ? (
                    [1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-lg border border-border bg-muted" />)
                  ) : sources.length ? (
                    sources.map((source) => {
                      const selected = selectedSource?.id === source.id;
                      const designation = getContentDesignation(source);
                      return (
                        <article
                          key={source.id}
                          className={cn(
                            'rounded-lg border bg-background p-4 shadow-sm transition-colors',
                            selected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => selectSource(source)}
                              className={cn(
                                'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors',
                                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-transparent'
                              )}
                              aria-label={selected ? 'Selected source' : 'Select source'}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className={cn('max-w-[220px] truncate rounded-full text-[11px]', designationLabelClass(designation))}>
                                  {designation}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{formatDate(source.publishedAt)}</span>
                                {source.publisher ? <span className="text-xs text-muted-foreground">{source.publisher}</span> : null}
                              </div>
                              <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5">{decodeLite(source.title || 'Untitled source')}</h3>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                {decodeLite(source.excerpt || getSourceBody(source) || 'No excerpt available.')}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {getSourceCategories(source).slice(0, 4).map((category) => (
                                  <span key={category} className={cn('rounded-full border px-2 py-1 text-[11px] font-medium', tagLabelClass(category))}>
                                    {category}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                      No matching content found.
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="flex items-center justify-between border-t border-border p-4">
                <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
                <span className="text-xs text-muted-foreground">Page {page}</span>
                <Button type="button" variant="outline" disabled={!data?.hasNextPage} onClick={() => setPage((value) => value + 1)}>Next</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base">Configuration</CardTitle>
              <p className="text-sm text-muted-foreground">Tune the audience and regional lens before generating.</p>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="canadianizer-audience">Audience</label>
                <Textarea id="canadianizer-audience" value={audience} onChange={(event) => setAudience(event.target.value)} className="min-h-20" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Region</label>
                  <Select value={province} onValueChange={setProvince}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Canada-wide">Canada-wide</SelectItem>
                      <SelectItem value="Ontario">Ontario</SelectItem>
                      <SelectItem value="British Columbia">British Columbia</SelectItem>
                      <SelectItem value="Alberta">Alberta</SelectItem>
                      <SelectItem value="Quebec">Quebec</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Length</label>
                  <Select value={length} onValueChange={setLength}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shorter">Shorter</SelectItem>
                      <SelectItem value="similar">Similar to source</SelectItem>
                      <SelectItem value="expanded">Expanded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="canadianizer-tone">Tone</label>
                <Input id="canadianizer-tone" value={tone} onChange={(event) => setTone(event.target.value)} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 p-3">
                <div>
                  <div className="text-sm font-semibold">Include non-advice note</div>
                  <div className="text-xs text-muted-foreground">Adds a short review-safe disclosure-style line.</div>
                </div>
                <Switch checked={includeDisclosure} onCheckedChange={setIncludeDisclosure} />
              </div>
              <div className={cn('flex items-center justify-between rounded-md border p-3', extremeMode ? 'border-red-200 bg-red-50' : 'border-border bg-muted/20')}>
                <div className="flex items-start gap-3">
                  <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md', extremeMode ? 'bg-red-600 text-white' : 'bg-background text-primary')}>
                    <Leaf className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">Extreme maple mode</div>
                    <div className="text-xs leading-5 text-muted-foreground">
                      Turns the professional adaptation into an intentionally over-Canadian comedic draft for internal fun.
                    </div>
                  </div>
                </div>
                <Switch checked={extremeMode} onCheckedChange={setExtremeMode} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          ) : null}
          <Card>
            <CardHeader className="border-b border-border">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Canadianized Output</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Side-by-side review with a match score and conversion notes.</p>
                </div>
                {result ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="min-w-[150px] rounded-md border border-border bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase text-muted-foreground">Match</span>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className={cn('mt-1 text-2xl font-semibold', scoreClass(result.matchScore))}>{result.matchScore}%</div>
                        <Progress value={result.matchScore} className="mt-2" />
                        <div className="mt-2 text-xs font-medium">{result.matchScoreLabel}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm leading-5">
                      {result.scoreRationale}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!result ? (
                <div className="flex min-h-[540px] flex-col items-center justify-center gap-3 p-8 text-center">
                  {isGenerating ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Flag className="h-9 w-9 text-primary" />}
                  <div className="text-sm font-semibold">{isGenerating ? 'Building Canadian draft' : 'Select content and run Canadianizer'}</div>
                  <p className="max-w-md text-sm leading-6 text-muted-foreground">
                    The generated output will compare the source article with a Canadianized version and explain where the conversion worked or needs human review.
                  </p>
                </div>
              ) : (
                <div className="grid min-h-[620px] lg:grid-cols-2">
                  <div className="border-b border-border lg:border-b-0 lg:border-r">
                    <div className="border-b border-border bg-muted/30 px-4 py-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">Original source</div>
                      <div className="mt-1 line-clamp-2 text-sm font-semibold">{decodeLite(selectedSource?.title || result.source.title || 'Original source')}</div>
                    </div>
                    <ScrollArea className="h-[560px]">
                      <div className="space-y-3 p-4 text-sm leading-7 text-muted-foreground">
                        {(getSourceBody(selectedSource || ({} as SourceContent)) || 'Original body unavailable.').split(/\n{2,}/).slice(0, 80).map((block, index) => (
                          <p key={index}>{decodeLite(block.trim())}</p>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  <div>
                    <div className="border-b border-border bg-red-50/70 px-4 py-3">
                      <div className="text-xs font-semibold uppercase text-red-700">Canadian draft</div>
                      <div className="mt-1 line-clamp-2 text-sm font-semibold">{result.canadianTitle}</div>
                    </div>
                    <ScrollArea className="h-[560px]">
                      <div className="p-4">
                        <MarkdownPreview content={result.canadianArticleMarkdown} />
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {result ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-base">Equivalent Map</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  {result.equivalentMap.map((item) => (
                    <div key={`${item.americanConcept}-${item.canadianEquivalent}`} className="rounded-md border border-border p-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        <span>{item.americanConcept}</span>
                        <span className="text-muted-foreground">→</span>
                        <span>{item.canadianEquivalent}</span>
                        <Badge variant="outline" className="capitalize">{item.confidence}</Badge>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.notes}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-base">Review Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Gaps and non-matches</div>
                    <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                      {result.gapsAndNonMatches.length ? result.gapsAndNonMatches.map((item) => <li key={item}>{item}</li>) : <li>No major gaps reported.</li>}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Compliance review</div>
                    <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                      {result.complianceNotes.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Editorial notes</div>
                    <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                      {result.editorialNotes.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
