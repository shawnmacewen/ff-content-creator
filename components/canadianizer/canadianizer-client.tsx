'use client';

import * as React from 'react';
import useSWR from 'swr';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ClipboardList,
  FileText,
  Flag,
  Info,
  Languages,
  Leaf,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';

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
  frenchTitle?: string | null;
  frenchArticleMarkdown?: string | null;
  frenchExecutiveSummary?: string | null;
  translationNotes?: string[];
  frenchQualityScore?: number | null;
  frenchQualityLabel?: 'Native editorial' | 'Strong Quebec French' | 'Needs review' | 'Weak translation' | null;
  frenchQualityRationale?: string | null;
  frenchQualityNotes?: string[];
  matchScore: number;
  matchScoreLabel: 'Strong match' | 'Good match' | 'Partial match' | 'Low match';
  warningLevel: 'none' | 'review' | 'severe';
  warningMessage: string;
  scoreRationale: string;
  evaluator?: {
    originalConcepts: string[];
    convertedConcepts: string[];
    unsupportedClaims: string[];
    missingOrWeakEquivalents: string[];
    evaluatorNotes: string[];
  };
  promptLog?: Array<{
    step: string;
    model: string;
    temperature: number;
    prompt: string;
  }>;
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
  config?: {
    model?: string;
    languagePackage?: 'both' | 'english' | 'french';
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

function warningClass(level?: CanadianizedResult['warningLevel']) {
  if (level === 'severe') return 'border-red-300 bg-red-50 text-red-950';
  if (level === 'review') return 'border-amber-300 bg-amber-50 text-amber-950';
  return 'border-emerald-200 bg-emerald-50 text-emerald-950';
}

function PromptLogDialog({ result }: { result: CanadianizedResult }) {
  const logs = result.promptLog || [];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <ClipboardList className="h-3.5 w-3.5" />
          Prompt Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <DialogTitle>Canadianizer Prompt History</DialogTitle>
          <div className="text-sm leading-6 text-muted-foreground">
            Shows the generation prompt and the second-pass evaluator prompt used for this run.
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(92vh-8rem)]">
          <div className="space-y-4 p-5">
            {logs.length ? logs.map((log) => (
              <div key={log.step} className="rounded-md border border-border bg-background">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <div className="text-sm font-semibold capitalize">{log.step}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{log.model}</Badge>
                    <Badge variant="outline">temp {log.temperature}</Badge>
                  </div>
                </div>
                <pre className="max-h-[460px] overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-5 text-muted-foreground">
                  {log.prompt}
                </pre>
              </div>
            )) : (
              <div className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
                No prompt log was returned for this run.
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
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
  const [model, setModel] = React.useState('gpt-4o-mini');
  const [languagePackage, setLanguagePackage] = React.useState<'both' | 'english' | 'french'>('both');
  const [outputLanguage, setOutputLanguage] = React.useState<'english' | 'french'>('english');
  const [controlsCollapsed, setControlsCollapsed] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<CanadianizedResult | null>(null);
  const [editedEnglish, setEditedEnglish] = React.useState('');
  const [editedFrench, setEditedFrench] = React.useState('');

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

  React.useEffect(() => {
    if (languagePackage === 'french') setOutputLanguage('french');
    if (languagePackage === 'english') setOutputLanguage('english');
  }, [languagePackage]);

  React.useEffect(() => {
    if (result?.config?.languagePackage === 'french') setOutputLanguage('french');
    if (result?.config?.languagePackage === 'english') setOutputLanguage('english');
  }, [result]);

  React.useEffect(() => {
    if (result) setControlsCollapsed(true);
  }, [result]);

  React.useEffect(() => {
    setEditedEnglish(result?.canadianArticleMarkdown || '');
    setEditedFrench(result?.frenchArticleMarkdown || '');
  }, [result]);

  const selectSource = async (source: SourceContent) => {
    setError(null);
    setResult(null);
    setControlsCollapsed(false);
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
          languagePackage,
          model,
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

  const saveCanadianizedDraft = async () => {
    if (!result) return;
    const content = outputLanguage === 'french' && result.frenchArticleMarkdown ? editedFrench : editedEnglish;
    const title = outputLanguage === 'french' && result.frenchTitle ? result.frenchTitle : result.canadianTitle;

    if (!content.trim()) {
      toast.error('Nothing to save yet');
      return;
    }

    setIsSavingDraft(true);
    try {
      const response = await fetch('/api/generated-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'article',
          title: title || 'Canadianized draft',
          content,
          sourceContentIds: result.source?.id ? [result.source.id] : [],
          prompt: `Canadianizer ${result.config?.languagePackage || languagePackage} adaptation`,
          tone: 'professional',
          status: 'draft',
          versionNote: outputLanguage === 'french' ? 'Saved French Canadianizer output' : 'Saved English Canadianizer output',
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Failed to save Canadianizer draft');
      toast.success('Saved to Saved Content');
    } catch (saveError: any) {
      toast.error(saveError?.message || 'Failed to save Canadianizer draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <PageHeader
        eyebrow="Canadianizer Eh?"
        title="Canadianizer"
        description="Select one source article, configure the Canadian lens, and generate a side-by-side adaptation with an equivalency score."
        metrics={[
          {
            label: 'One source article',
            detail: selectedSource ? decodeLite(selectedSource.title || 'Selected content') : 'Choose a U.S. baseline article',
            icon: FileText,
          },
          {
            label: 'Canadian equivalency',
            detail: extremeMode ? 'Maple Mode adds intentionally over-Canadian comic styling' : 'Tax, plan, savings, and market concepts are converted when a reasonable Canadian match exists',
            icon: extremeMode ? Leaf : Flag,
            iconClassName: 'bg-red-600 text-white',
          },
          {
            label: 'Match score',
            detail: result ? `${result.matchScore}% ${result.matchScoreLabel} with ${result.config?.model || model}` : 'Explains where the adaptation is strong or weak',
            icon: BadgeCheck,
            iconClassName: 'bg-emerald-600 text-white',
          },
          {
            label: 'Language package',
            detail: languagePackage === 'both' ? 'English and Quebec French' : languagePackage === 'french' ? 'Quebec French only' : 'English only',
            icon: Languages,
            iconClassName: 'bg-blue-600 text-white',
          },
        ]}
        variant="red"
      />

      <div className="flex justify-end">
        <Button type="button" disabled={!selectedSource || isGenerating} onClick={runCanadianizer} className="gap-2">
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isGenerating ? 'Canadianizing' : 'Canadianize'}
        </Button>
      </div>

      <div className="flex flex-col gap-5 xl:flex-row">
        <section
          className={cn(
            'space-y-4 transition-all duration-500 ease-in-out xl:shrink-0 xl:overflow-hidden',
            controlsCollapsed ? 'xl:w-0 xl:-translate-x-6 xl:opacity-0' : 'xl:w-[42%] xl:translate-x-0 xl:opacity-100'
          )}
        >
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
                <label className="text-xs font-semibold uppercase text-muted-foreground">OpenAI model</label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o mini - fast/current default</SelectItem>
                    <SelectItem value="gpt-4.1">GPT-4.1 - stronger non-reasoning</SelectItem>
                    <SelectItem value="gpt-5.2">GPT-5.2 - strong comparison model</SelectItem>
                    <SelectItem value="gpt-5.5">GPT-5.5 - latest/strongest</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">
                  Use mini for faster experiments. Use GPT-5.5 for stricter Canadian equivalency judgment on high-risk articles.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="canadianizer-tone">Tone</label>
                <Input id="canadianizer-tone" value={tone} onChange={(event) => setTone(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Language package</label>
                <Select value={languagePackage} onValueChange={(value: 'both' | 'english' | 'french') => setLanguagePackage(value)}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">English + Quebec French</SelectItem>
                    <SelectItem value="english">English only</SelectItem>
                    <SelectItem value="french">Quebec French only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">
                  French is translated from the generated Canadian English article so both versions stay matched.
                </p>
              </div>
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-950">
                Canadianizer actively looks for defensible Canadian parallels before marking a gap. Useful examples include Statistics Canada for national statistics, CPP/OAS for retirement income framing, CRA for tax context, and RRSP/TFSA/RESP where the source concept supports that mapping.
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
                    <div className="text-sm font-semibold">Maple Mode</div>
                    <div className="text-xs leading-5 text-muted-foreground">
                      For internal use only. 🍁
                    </div>
                  </div>
                </div>
                <Switch checked={extremeMode} onCheckedChange={setExtremeMode} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="min-w-0 flex-1 space-y-4 transition-all duration-500 ease-in-out">
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
                  <div className="flex flex-wrap items-start gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSavingDraft}
                      onClick={saveCanadianizedDraft}
                    >
                      {isSavingDraft ? 'Saving...' : 'Save Draft'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setControlsCollapsed((value) => !value)}
                    >
                      {controlsCollapsed ? 'Show Setup' : 'Hide Setup'}
                    </Button>
                    <PromptLogDialog result={result} />
                    {result.frenchArticleMarkdown && result.config?.languagePackage !== 'french' ? (
                      <div className="rounded-md border border-border bg-background p-1">
                        <Button
                          type="button"
                          variant={outputLanguage === 'english' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setOutputLanguage('english')}
                        >
                          English
                        </Button>
                        <Button
                          type="button"
                          variant={outputLanguage === 'french' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setOutputLanguage('french')}
                        >
                          French
                        </Button>
                      </div>
                    ) : null}
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
                    {typeof result.frenchQualityScore === 'number' ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="min-w-[150px] rounded-md border border-border bg-background p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold uppercase text-muted-foreground">French</span>
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className={cn('mt-1 text-2xl font-semibold', scoreClass(result.frenchQualityScore))}>{result.frenchQualityScore}%</div>
                            <Progress value={result.frenchQualityScore} className="mt-2" />
                            <div className="mt-2 text-xs font-medium">{result.frenchQualityLabel || 'French quality'}</div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm leading-5">
                          {result.frenchQualityRationale || 'Quebec French editorial quality score.'}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
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
                <div>
                  {result.warningLevel !== 'none' ? (
                    <div className={cn('m-4 rounded-md border p-3 text-sm leading-6', warningClass(result.warningLevel))}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <div className="font-semibold">{result.warningLevel === 'severe' ? 'Severe conversion warning' : 'Conversion review warning'}</div>
                          <div>{result.warningMessage}</div>
                        </div>
                      </div>
                    </div>
                  ) : null}
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
                        <div className="text-xs font-semibold uppercase text-red-700">
                          {outputLanguage === 'french' && result.frenchArticleMarkdown ? 'Quebec French draft' : 'Canadian English draft'}
                        </div>
                        <div className="mt-1 line-clamp-2 text-sm font-semibold">
                          {outputLanguage === 'french' && result.frenchTitle ? result.frenchTitle : result.canadianTitle}
                        </div>
                      </div>
                      <ScrollArea className="h-[560px]">
                        <div className="p-4">
                          <Textarea
                            value={outputLanguage === 'french' && result.frenchArticleMarkdown ? editedFrench : editedEnglish}
                            onChange={(event) => {
                              if (outputLanguage === 'french' && result.frenchArticleMarkdown) {
                                setEditedFrench(event.target.value);
                              } else {
                                setEditedEnglish(event.target.value);
                              }
                            }}
                            className="min-h-[500px] resize-y bg-white font-mono text-sm leading-6"
                          />
                          <div className="mt-2 text-xs text-muted-foreground">
                            Edits here are saved only when you choose Save Draft.
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
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
                  {result.evaluator?.unsupportedClaims?.length ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3">
                      <div className="mb-2 text-xs font-semibold uppercase text-red-800">Unsupported or risky Canadian claims</div>
                      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-red-950">
                        {result.evaluator.unsupportedClaims.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  {result.evaluator?.missingOrWeakEquivalents?.length ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                      <div className="mb-2 text-xs font-semibold uppercase text-amber-800">Missing or weak equivalents</div>
                      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-amber-950">
                        {result.evaluator.missingOrWeakEquivalents.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Gaps and non-matches</div>
                    <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                      {result.gapsAndNonMatches.length ? result.gapsAndNonMatches.map((item) => <li key={item}>{item}</li>) : <li>No major gaps reported.</li>}
                    </ul>
                  </div>
                  <div>
                    {result.translationNotes?.length ? (
                      <>
                        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Quebec French translation</div>
                        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                          {result.translationNotes.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </>
                    ) : null}
                    {result.frenchQualityNotes?.length ? (
                      <>
                        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Montreal French quality</div>
                        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                          {result.frenchQualityNotes.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </>
                    ) : null}
                    <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Compliance review</div>
                    <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                      {result.complianceNotes.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Evaluator notes</div>
                    <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                      {(result.evaluator?.evaluatorNotes || []).map((item) => <li key={item}>{item}</li>)}
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
    </div>
  );
}
