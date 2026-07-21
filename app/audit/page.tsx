'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/page-header';
import { Calendar, CheckCircle2, FileSearch, HelpCircle, Loader2, Plus, Search, SlidersHorizontal, Sparkles, User, X, XCircle } from 'lucide-react';
import { ContentDetail } from '@/components/source-content/content-detail';
import type { SourceContent } from '@/lib/types/content';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Match = {
  id: string;
  externalId?: string | null;
  basContentId?: string | null;
  basContentFilename?: string | null;
  title: string;
  publisher: string | null;
  sourceSystem: string | null;
  type?: string | null;
  publishedAt: string | null;
  url?: string | null;
  tags?: string[];
  body?: string;
  excerpt?: string;
  snippet: string;
  score: number;
  matchedTerms?: string[];
  excludedTerms?: string[];
  matchedFields?: string[];
  matchContexts?: Array<{
    field: string;
    label: string;
    snippet: string;
  }>;
  reason?: string;
  evidence?: string;
  confidence?: number;
};

type SearchScope = 'all' | 'title' | 'filename' | 'body' | 'metadata';

const SEARCH_SCOPE_LABELS: Record<SearchScope, string> = {
  all: 'All content fields',
  title: 'Title only',
  filename: 'Filename only',
  body: 'Body text only',
  metadata: 'Metadata and tags',
};

function matchFieldLabel(field: string) {
  if (field === 'filename') return 'BAS filename';
  if (field === 'metadata') return 'metadata/tags';
  if (field === 'body') return 'body';
  if (field === 'title') return 'title';
  return field;
}

function splitSearchTermsInput(input: string) {
  const text = String(input || '').trim();
  if (!text) return [];

  const quoted = Array.from(text.matchAll(/"([^"]+)"/g))
    .map((match) => match[1]?.trim())
    .filter(Boolean) as string[];

  const unquoted = text
    .replace(/"[^"]+"/g, ' ')
    .split(/,|\n|;|\s+/g)
    .map((term) => term.trim())
    .filter(Boolean);

  return Array.from(new Set([...quoted, ...unquoted]));
}

function mergeSearchTerms(savedTerms: string[], draft: string) {
  return Array.from(new Set([...savedTerms, ...splitSearchTermsInput(draft)])).join('\n');
}

export default function AuditPage() {
  const [prompt, setPrompt] = useState('');
  const [includeTerms, setIncludeTerms] = useState('');
  const [excludeTerms, setExcludeTerms] = useState('');
  const [savedIncludeTerms, setSavedIncludeTerms] = useState<string[]>([]);
  const [savedExcludeTerms, setSavedExcludeTerms] = useState<string[]>([]);
  const [publisher, setPublisher] = useState('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [method, setMethod] = useState<'search' | 'analyze'>('search');
  const [matchMode, setMatchMode] = useState<'all' | 'any'>('any');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [analyzeDepth, setAnalyzeDepth] = useState<'quick' | 'deep'>('quick');
  const [showSearchTips, setShowSearchTips] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [aiFocus, setAiFocus] = useState({
    relevant: true,
    gaps: true,
    outdated: false,
    duplicates: false,
  });
  const [aiDateRange, setAiDateRange] = useState('12m');
  const [aiContentType, setAiContentType] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<SourceContent | null>(null);
  const effectiveIncludeTerms = useMemo(() => mergeSearchTerms(savedIncludeTerms, includeTerms), [includeTerms, savedIncludeTerms]);
  const effectiveExcludeTerms = useMemo(() => mergeSearchTerms(savedExcludeTerms, excludeTerms), [excludeTerms, savedExcludeTerms]);

  const run = async () => {
    setLoading(true);
    setError('');
    setSelectedIds(new Set());
    try {
      const endpoint = method === 'analyze' ? '/api/audit/analyze' : '/api/audit/query';
      const searchPrompt = method === 'search'
        ? `include ${effectiveIncludeTerms || prompt}${effectiveExcludeTerms ? ` but not ${effectiveExcludeTerms}` : ''}`
        : prompt;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: searchPrompt,
          publisher,
          limit: method === 'search' ? 5000 : analyzeDepth === 'deep' ? 5000 : 3000,
          mode: matchMode,
          searchScope,
          depth: analyzeDepth,
          mustInclude: effectiveIncludeTerms,
          mustExclude: effectiveExcludeTerms,
        }),
      });
      const body = await res.json();
      setResult(body);
      if (!res.ok || body?.ok === false) {
        setError(body?.error || `Audit failed (${res.status})`);
      } else {
        toast.success(`${body?.total ?? body?.matches?.length ?? 0} matches found`);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
      toast.error('Content Scan failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      setSearchProgress(0);
      return;
    }

    setSearchProgress(8);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const target = method === 'search' ? 88 : analyzeDepth === 'deep' ? 78 : 84;
      setSearchProgress(Math.min(target, 8 + Math.round(elapsed / 180)));
    }, 300);

    return () => window.clearInterval(timer);
  }, [analyzeDepth, loading, method]);

  const csv = useMemo(() => {
    const rows: Match[] = result?.matches || [];
    const head = ['id','title','filename','contentId','publisher','sourceSystem','publishedAt','matchedFields','snippet'];
    const lines = rows.map((r) => [r.id,r.title,r.basContentFilename||'',r.basContentId||'',r.publisher||'',r.sourceSystem||'',r.publishedAt||'',(r.matchedFields||[]).join('|'),(r.snippet||'').replace(/"/g,'""')].map((v)=>`"${String(v)}"`).join(','));
    return [head.join(','), ...lines].join('\n');
  }, [result]);

  const publisherDisplay = (publisher: string | null) => {
    return publisher || 'Unavailable';
  };

  const publisherClass = (publisher: string | null, sourceSystem: string | null) => {
    if (publisher === 'publisher-content') return 'text-purple-500';
    if (sourceSystem === 'advisorstream') return 'text-blue-500';
    if (sourceSystem === 'sample-seed') return 'text-green-500';
    return 'text-blue-500';
  };

  const openDetails = (m: Match) => {
    const content: SourceContent = {
      id: m.id,
      title: m.title,
      body: m.body || m.snippet || '',
      excerpt: m.excerpt || m.snippet || '',
      type: (m.type as SourceContent['type']) || 'article',
      author: '',
      sourceSystem: m.sourceSystem || 'advisorstream',
      externalId: m.externalId || undefined,
      publisher: m.publisher || undefined,
      publishedAt: m.publishedAt || '',
      tags: Array.isArray(m.tags) ? m.tags : [],
      url: m.url || undefined,
      metadata: {
        extraPropertiesSelected: {
          BasContentFilename: m.basContentFilename || null,
          BasContentId: m.basContentId || null,
        },
      },
    };
    setSelectedContent(content);
    setDetailOpen(true);
  };

  const markNeedsUpdate = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const response = await fetch('/api/audit/mark', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, note: prompt || effectiveIncludeTerms }) });
    if (!response.ok) {
      toast.error('Failed to mark selected content');
      return;
    }
    toast.success(`${ids.length} item(s) marked`);
  };

  const matches = (result?.matches || []) as Match[];
  const resultTotal = result?.total ?? matches.length;
  const scanned = result?.scanned ?? 0;
  const candidateCount = result?.candidateCount;
  const chunkCount = result?.chunkCount;
  const scanModeLabel = method === 'search'
    ? 'Standard Search'
    : analyzeDepth === 'deep'
      ? 'AI Deep Scan'
      : 'AI Quick Scan';
  const scanRunningDetail = method === 'search'
    ? 'Scanning the 5,000 most recent source items through the server API across the selected fields.'
    : analyzeDepth === 'deep'
      ? 'Scanning up to 5,000 source items, ranking candidates, then applying deeper AI classification in smaller batches.'
      : 'Scanning up to 3,000 source items, ranking candidates, then applying focused AI classification to the strongest matches.';
  const includeCount = splitSearchTermsInput(effectiveIncludeTerms).length;
  const excludeCount = splitSearchTermsInput(effectiveExcludeTerms).length;
  const addIncludeTerm = () => {
    const additions = splitSearchTermsInput(includeTerms);
    if (!additions.length) return;
    setSavedIncludeTerms((terms) => Array.from(new Set([...terms, ...additions])));
    setIncludeTerms('');
  };
  const addExcludeTerm = () => {
    const additions = splitSearchTermsInput(excludeTerms);
    if (!additions.length) return;
    setSavedExcludeTerms((terms) => Array.from(new Set([...terms, ...additions])));
    setExcludeTerms('');
  };
  const clearCriteria = () => {
    setPrompt('');
    setIncludeTerms('');
    setExcludeTerms('');
    setSavedIncludeTerms([]);
    setSavedExcludeTerms([]);
    setPublisher('all');
    setMatchMode('any');
    setSearchScope('all');
    setAnalyzeDepth('quick');
    setAiFocus({ relevant: true, gaps: true, outdated: false, duplicates: false });
    setAiDateRange('12m');
    setAiContentType('all');
    setResult(null);
    setSelectedIds(new Set());
    setError('');
  };
  const searchedFieldLabel = method === 'search'
    ? SEARCH_SCOPE_LABELS[searchScope]
    : 'AI candidate fields';

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <PageHeader
        eyebrow="Content intelligence"
        title="Content Scan"
        description="Search and analyze source coverage before building new advisor campaigns."
        metrics={[]}
        variant="violet"
      />

      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <button
            type="button"
            onClick={() => setMethod('search')}
            className={cn(
              'flex min-h-[92px] items-center justify-between gap-4 rounded-lg border p-4 text-left shadow-sm transition',
              method === 'search'
                ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                : 'border-slate-200 bg-white hover:border-blue-200'
            )}
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-md border',
                method === 'search'
                  ? 'border-blue-100 bg-blue-100 text-blue-700'
                  : 'border-blue-100 bg-blue-50 text-blue-600'
              )}>
                <Search className="h-6 w-6" />
              </span>
              <div>
                <div className="text-base font-semibold text-slate-950">Standard Search</div>
                <div className="mt-1 text-sm text-slate-500">Find exact words and phrases across titles, summaries, tags, and article text.</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={cn(
                'hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex',
                method === 'search'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-400'
              )}>Precise matching</span>
              {method === 'search' ? (
                <CheckCircle2 className="h-6 w-6 fill-blue-600 text-white" />
              ) : (
                <span className="h-5 w-5 rounded-full border-2 border-slate-300 bg-white" />
              )}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setMethod('analyze')}
            className={cn(
              'flex min-h-[92px] items-center justify-between gap-4 rounded-lg border p-4 text-left shadow-sm transition',
              method === 'analyze'
                ? 'border-violet-600 bg-violet-50/60 ring-1 ring-violet-600'
                : 'border-slate-200 bg-white hover:border-violet-200'
            )}
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-md border',
                method === 'analyze'
                  ? 'border-violet-100 bg-violet-100 text-violet-700'
                  : 'border-violet-100 bg-violet-50 text-violet-500'
              )}>
                <Sparkles className="h-6 w-6" />
              </span>
              <div>
                <div className="text-base font-semibold text-slate-950">AI Scan</div>
                <div className="mt-1 text-sm text-slate-500">Describe what you want to find and analyze semantically.</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={cn(
                'hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex',
                method === 'analyze'
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-slate-100 text-slate-400'
              )}>Broader discovery</span>
              {method === 'analyze' ? (
                <CheckCircle2 className="h-6 w-6 fill-violet-600 text-white" />
              ) : (
                <span className="h-5 w-5 rounded-full border-2 border-slate-300 bg-white" />
              )}
            </div>
          </button>
        </div>
      </section>

      {method === 'analyze' ? (
        <section className="grid gap-4 lg:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-950">Set up your AI scan</h2>
                    <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">AI Scan</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500">AI Scan finds related ideas, themes, and coverage gaps, not only exact keywords.</p>
                </div>
              </div>
              <button type="button" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
                How AI Scan works
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-950">What do you want to analyze?</label>
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
                    className="min-h-[104px] w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-3 pb-7 text-sm leading-6 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    placeholder="Find recent content about retirement income strategies and identify topics we may be under-covering."
                    maxLength={500}
                  />
                  <span className="absolute bottom-2 right-3 text-xs font-medium text-slate-500">{prompt.length} / 500</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-950">Try an example</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Compare topic coverage',
                    'Find outdated content',
                    'Identify content gaps',
                  ].map((example) => (
                    <Button key={example} type="button" variant="outline" size="sm" className="border-violet-200 text-violet-700 hover:bg-violet-50" onClick={() => setPrompt(example)}>
                      {example}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-950">Analysis focus</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['relevant', 'Relevant content'],
                    ['gaps', 'Coverage gaps'],
                    ['outdated', 'Outdated content'],
                    ['duplicates', 'Duplicate themes'],
                  ].map(([key, label]) => {
                    const active = aiFocus[key as keyof typeof aiFocus];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAiFocus((value) => ({ ...value, [key]: !active }))}
                        className={cn(
                          'flex items-center gap-3 rounded-md border p-3 text-left text-sm font-semibold transition',
                          active
                            ? 'border-violet-400 bg-violet-50 text-slate-950 ring-1 ring-violet-300'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200'
                        )}
                      >
                        <span className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-md border',
                          active ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white text-transparent'
                        )}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-950">Scope</div>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-xs font-medium text-slate-500">
                    Publisher
                    <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900" value={publisher} onChange={(e) => setPublisher(e.target.value)}>
                      <option value="all">All publishers</option>
                      <option value="broadridge-forefield">broadridge-forefield</option>
                      <option value="publisher-content">publisher-content</option>
                      <option value="custom-content">custom-content</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-500">
                    Date range
                    <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900" value={aiDateRange} onChange={(e) => setAiDateRange(e.target.value)}>
                      <option value="12m">Past 12 months</option>
                      <option value="6m">Past 6 months</option>
                      <option value="all">Any date</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-500">
                    Content type
                    <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900" value={aiContentType} onChange={(e) => setAiContentType(e.target.value)}>
                      <option value="all">All types</option>
                      <option value="article">Articles</option>
                      <option value="topic">Topic discussions</option>
                    </select>
                  </label>
                </div>
                <details className="rounded-md border border-slate-200 bg-white">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-700">Advanced options</summary>
                  <div className="border-t border-slate-200 p-3">
                    <label className="space-y-1 text-xs font-medium text-slate-500">
                      Scan depth
                      <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900" value={analyzeDepth} onChange={(e) => setAnalyzeDepth(e.target.value as 'quick' | 'deep')}>
                        <option value="quick">AI Quick Scan</option>
                        <option value="deep">AI Deep Scan</option>
                      </select>
                    </label>
                  </div>
                </details>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500">
                <HelpCircle className="h-4 w-4" />
                <span>AI may return conceptually related content.</span>
              </div>

              <Button onClick={run} disabled={loading || !prompt.trim()} className="h-12 w-full gap-2 rounded-md bg-violet-600 text-base font-semibold hover:bg-violet-700">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {loading ? `${scanModeLabel} running...` : 'Run AI scan'}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-50 text-cyan-700">
                  <FileSearch className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-semibold text-slate-950">Scan results</h2>
                <Badge variant="secondary">{resultTotal || 0}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={() => {
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'audit-results.csv'; a.click();
                  URL.revokeObjectURL(url);
                }} disabled={!result?.matches?.length}>Export CSV</Button>
                <Button variant="outline" onClick={markNeedsUpdate} disabled={!selectedIds.size}>Mark needs update</Button>
              </div>
            </div>
            <div className="px-5 pt-4">
              <div className="inline-grid grid-cols-3 overflow-hidden rounded-md border border-slate-200 text-sm font-semibold">
                <button type="button" className="bg-cyan-50 px-6 py-3 text-cyan-700">Matches</button>
                <button type="button" className="border-l border-slate-200 px-6 py-3 text-slate-600">Coverage insights</button>
                <button type="button" className="border-l border-slate-200 px-6 py-3 text-slate-600">Update opportunities</button>
              </div>
            </div>
            <div className="space-y-3 p-5">
              {error ? (
                <div className="text-sm text-destructive rounded border border-destructive/30 bg-destructive/10 p-3">{error}</div>
              ) : null}
              {loading ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 text-center text-sm text-slate-500">
                  <Loader2 className="h-9 w-9 animate-spin text-violet-700" />
                  <div className="font-semibold text-slate-950">{scanModeLabel} in progress</div>
                  <div>{scanRunningDetail}</div>
                  <div className="mt-2 h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-violet-600 transition-all duration-300" style={{ width: `${searchProgress}%` }} />
                  </div>
                </div>
              ) : !result ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center gap-5 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-md bg-violet-50 text-violet-400">
                    <FileSearch className="h-14 w-14" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-950">Discover what your library already covers</div>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Run an AI scan to find relevant content, topic gaps, and potential update opportunities.</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4">
                    <span className="rounded-md border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700">Relevant matches</span>
                    <span className="rounded-md border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-semibold text-cyan-700">Coverage themes</span>
                    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700">Suggested updates</span>
                  </div>
                  <p className="text-sm text-slate-500">Results will appear here without leaving this page.</p>
                </div>
              ) : null}

              {result && !loading && !error && matches.length === 0 ? (
                <div className="rounded-md border border-slate-200 p-4 text-sm text-slate-500">No matches found for this query. Try broader wording or remove exclusions.</div>
              ) : null}

              {matches.map((m: Match) => (
                <div key={m.id} className="space-y-2 rounded-md border border-slate-200 p-3">
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={(e)=>setSelectedIds((prev)=>{const n=new Set(prev); if(e.target.checked)n.add(m.id); else n.delete(m.id); return n;})} /> select</label>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="font-medium">{m.title}</div>
                      <div className="text-xs text-muted-foreground">{m.externalId ? `External Article ID: ${m.externalId}` : 'External Article ID unavailable'}</div>
                    </div>
                    <span className={`text-xs font-medium ${publisherClass(m.publisher, m.sourceSystem)}`}>{publisherDisplay(m.publisher)}</span>
                  </div>
                  {m.reason ? <p className="text-sm text-foreground/90">Reason: {m.reason}</p> : null}
                  {m.evidence ? <p className="rounded-md bg-primary/5 px-3 py-2 text-sm text-foreground/90">{m.evidence}</p> : null}
                  <p className="text-sm text-muted-foreground">{m.snippet || 'No snippet available.'}</p>
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => openDetails(m)}>View Details</Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {method === 'search' ? (
        <section className="grid gap-4 lg:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-700">
                  <Search className="h-5 w-5" />
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-950">Standard Search criteria</h2>
                </div>
              </div>
              <button type="button" onClick={() => setShowSearchTips((value) => !value)} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
                <HelpCircle className="h-4 w-4" />
                Search tips
              </button>
            </div>

            <div className="mb-5 flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm text-slate-600">
              <HelpCircle className="h-4 w-4 shrink-0 text-blue-700" />
              <span>Use quotation marks for exact phrases. Standard Search runs through the API against the source database and returns only matching records to this page.</span>
            </div>

            {showSearchTips ? (
              <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                <div className="font-semibold text-slate-950">Standard Search technical details</div>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="font-semibold text-slate-800">How it searches</div>
                    <p>Search is submitted to <code className="rounded bg-white px-1 font-mono text-xs text-slate-800">/api/audit/query</code>, which queries <code className="rounded bg-white px-1 font-mono text-xs text-slate-800">source_content</code> on the server. The browser does not load the full content library to search locally.</p>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">Default fields</div>
                    <p>All fields checks title, filename/BAS id, external id, excerpt, audience, takeaways, tags, categories, subcategories, and normalized article body text.</p>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">Multiple terms</div>
                    <p>Type unquoted words to add separate terms, or wrap words in quotes for an exact phrase. Saved include terms match any term by default; switch Match logic to all when every term must appear.</p>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">Scope options</div>
                    <p>Title only, Filename only, Body text only, and Metadata/tags narrow the actual backend match field, not just the display.</p>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">Active filters</div>
                    <p>Publisher, match logic, and Search in are active today. Date and additional filters are shown as planned controls until backend filtering is added.</p>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">Current cap</div>
                    <p>Each run scans up to 5,000 newest source rows after publisher filtering, then returns deterministic matches with matched term and field diagnostics.</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-950">Include terms</label>
                <p className="text-xs text-slate-500">Words or quoted exact phrases to find</p>
                <div className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <Input
                    value={includeTerms}
                    onChange={(e) => setIncludeTerms(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addIncludeTerm();
                      }
                    }}
                    className="h-9 min-w-[180px] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                    placeholder='"2025 mileage rate"'
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addIncludeTerm} disabled={!includeTerms.trim()} className="h-8 shrink-0 gap-1 border-blue-200 px-2 text-blue-700 hover:bg-blue-50">
                    <Plus className="h-3.5 w-3.5" />
                    Add term
                  </Button>
                  {includeTerms ? (
                    <button type="button" onClick={() => setIncludeTerms('')} aria-label="Clear include terms" className="shrink-0 text-slate-500 hover:text-slate-800">
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                {savedIncludeTerms.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {savedIncludeTerms.map((term) => (
                      <Badge key={`saved-include-${term}`} variant="outline" className="gap-1 bg-emerald-50 text-emerald-700">
                        include: {term}
                        <button type="button" onClick={() => setSavedIncludeTerms((terms) => terms.filter((item) => item !== term))} aria-label={`Remove include term ${term}`} className="ml-1 rounded-sm text-emerald-700 hover:text-emerald-900">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-950">Exclude terms <span className="font-normal text-slate-500">(optional)</span></label>
                <p className="text-xs text-slate-500">Remove content containing these words or phrases</p>
                <div className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <Input
                    value={excludeTerms}
                    onChange={(e) => setExcludeTerms(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addExcludeTerm();
                      }
                    }}
                    className="h-9 min-w-[180px] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                    placeholder='"2026 mileage rate"'
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addExcludeTerm} disabled={!excludeTerms.trim()} className="h-8 shrink-0 gap-1 border-red-200 px-2 text-red-700 hover:bg-red-50">
                    <Plus className="h-3.5 w-3.5" />
                    Add term
                  </Button>
                  {excludeTerms ? (
                    <button type="button" onClick={() => setExcludeTerms('')} aria-label="Clear exclude terms" className="shrink-0 text-slate-500 hover:text-slate-800">
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                {savedExcludeTerms.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {savedExcludeTerms.map((term) => (
                      <Badge key={`saved-exclude-${term}`} variant="outline" className="gap-1 bg-red-50 text-red-700">
                        exclude: {term}
                        <button type="button" onClick={() => setSavedExcludeTerms((terms) => terms.filter((item) => item !== term))} aria-label={`Remove exclude term ${term}`} className="ml-1 rounded-sm text-red-700 hover:text-red-900">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5">
              <div className="text-sm font-semibold text-slate-950">Search scope</div>
              <div className="mt-2 grid gap-4">
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Publisher
                  <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900" value={publisher} onChange={(e) => setPublisher(e.target.value)}>
                    <option value="all">All publishers</option>
                    <option value="broadridge-forefield">broadridge-forefield</option>
                    <option value="publisher-content">publisher-content</option>
                    <option value="custom-content">custom-content</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Match logic
                  <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900" value={matchMode} onChange={(e) => setMatchMode(e.target.value as 'all' | 'any')}>
                    <option value="any">Match any include terms</option>
                    <option value="all">Match all include terms</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Search in
                  <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900" value={searchScope} onChange={(e) => setSearchScope(e.target.value as SearchScope)}>
                    <option value="all">All content fields</option>
                    <option value="title">Title only</option>
                    <option value="filename">Filename only</option>
                    <option value="body">Body text only</option>
                    <option value="metadata">Metadata and tags</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Date
                  <Button type="button" variant="outline" disabled title="Date filtering is planned but not active for Standard Search yet." className="h-10 w-full justify-start gap-2 text-sm font-normal">
                    <Calendar className="h-4 w-4" />
                    Any date (not filtered)
                  </Button>
                </label>
                <div className="flex items-end">
                  <Button type="button" variant="outline" disabled title="Additional filters are planned but not active for Standard Search yet." className="h-10 w-full justify-start gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    More filters planned
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50/40 px-4 py-3">
              <div className="flex min-w-0 flex-wrap items-center gap-4 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2 font-medium text-blue-700">
                  <Search className="h-4 w-4" />
                  {effectiveIncludeTerms ? `Include: ${splitSearchTermsInput(effectiveIncludeTerms).join(', ')}` : 'Add include terms to search'}
                </span>
                {effectiveExcludeTerms ? (
                  <>
                    <span className="text-slate-400">|</span>
                    <span>Excluding: {splitSearchTermsInput(effectiveExcludeTerms).join(', ')}</span>
                  </>
                ) : null}
                <span className="text-slate-400">|</span>
                <span>Search in: {SEARCH_SCOPE_LABELS[searchScope]}</span>
                <span className="text-slate-400">|</span>
                <span>{matchMode === 'any' ? 'Matching any include term' : 'Matching all include terms'}</span>
              </div>
              <div className="text-sm text-slate-500">
                {includeCount} include term{includeCount === 1 ? '' : 's'} · {excludeCount} exclusion{excludeCount === 1 ? '' : 's'}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="ghost" onClick={clearCriteria} className="text-blue-700 hover:bg-blue-50 hover:text-blue-800">Clear</Button>
              <Button onClick={run} disabled={loading || !effectiveIncludeTerms.trim()} className="h-11 gap-2 bg-blue-700 px-6 font-semibold hover:bg-blue-800">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? 'Running search...' : 'Run standard search'}
              </Button>
            </div>
          </section>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-50 text-cyan-700">
                  <FileSearch className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-semibold text-slate-950">Scan results</h2>
                <Badge variant="secondary">{resultTotal || 0}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={() => {
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'audit-results.csv'; a.click();
                  URL.revokeObjectURL(url);
                }} disabled={!result?.matches?.length}>Export CSV</Button>
                <Button variant="outline" onClick={markNeedsUpdate} disabled={!selectedIds.size}>Mark needs update</Button>
              </div>
            </div>
            <div className="px-5 pt-4">
              <div className="inline-grid grid-cols-3 overflow-hidden rounded-md border border-slate-200 text-sm font-semibold">
                <button type="button" className="bg-cyan-50 px-6 py-3 text-cyan-700">Matches</button>
                <button type="button" className="border-l border-slate-200 px-6 py-3 text-slate-600">Coverage insights</button>
                <button type="button" className="border-l border-slate-200 px-6 py-3 text-slate-600">Update opportunities</button>
              </div>
            </div>
            <div className="space-y-3 p-5">
              {error ? (
                <div className="text-sm text-destructive rounded border border-destructive/30 bg-destructive/10 p-3">{error}</div>
              ) : null}
              {loading ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 text-center text-sm text-slate-500">
                  <Loader2 className="h-9 w-9 animate-spin text-blue-700" />
                  <div className="font-semibold text-slate-950">{scanModeLabel} in progress</div>
                  <div>{scanRunningDetail}</div>
                  <div className="mt-2 h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-700 transition-all duration-300" style={{ width: `${searchProgress}%` }} />
                  </div>
                  <div className="text-xs text-slate-500">Server-side API search · {searchedFieldLabel} · up to 5,000 source rows</div>
                </div>
              ) : !result ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center gap-5 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    <FileSearch className="h-14 w-14" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-950">Run a search to review coverage</div>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Matching content, coverage signals, and update opportunities will appear here.</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4">
                    <span className="rounded-md border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700">Exact matches</span>
                    <span className="rounded-md border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-semibold text-cyan-700">Coverage signals</span>
                    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700">Update opportunities</span>
                  </div>
                  <p className="text-sm text-slate-500">Results will appear here without leaving this page.</p>
                </div>
              ) : null}

              {result && !loading && !error && matches.length === 0 ? (
                <div className="rounded-md border border-slate-200 p-4 text-sm text-slate-500">No matches found for this query. Try broader wording or remove exclusions.</div>
              ) : null}

              {result && !loading && !error ? (
                <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-700 text-white">
                      <Search className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{resultTotal} matches</p>
                      <p className="text-xs text-slate-500">{Number(scanned || 0).toLocaleString()} recent source items scanned</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-50 text-cyan-700">
                      <FileSearch className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{scanModeLabel}</p>
                      <p className="text-xs text-slate-500">{result?.parserUsed === 'fallback' ? 'Fallback parser' : `Deterministic parser · ${result?.contentLoadMode === 'server-api' ? 'server API' : 'local'}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Criteria parsed</p>
                      <p className="text-xs text-slate-500">
                        {SEARCH_SCOPE_LABELS[result?.structured?.searchScope as SearchScope] || SEARCH_SCOPE_LABELS.all}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {result?.structured ? (
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  {(result.structured.mustInclude || []).map((term: string) => (
                    <Badge key={`include-${term}`} variant="outline" className="bg-emerald-50 text-emerald-700">
                      include: {term}
                    </Badge>
                  ))}
                  {(result.structured.mustExclude || []).map((term: string) => (
                    <Badge key={`exclude-${term}`} variant="outline" className="bg-red-50 text-red-700">
                      exclude: {term}
                    </Badge>
                  ))}
                  {result?.summary ? <span className="basis-full pt-1">{result.summary}</span> : null}
                  {result?.capped ? (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700">
                      scan cap reached: {Number(result?.scanned || 0).toLocaleString()} rows reviewed
                    </Badge>
                  ) : null}
                </div>
              ) : null}

              {matches.map((m: Match) => (
                <div key={m.id} className="space-y-2 rounded-md border border-slate-200 p-3">
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={(e)=>setSelectedIds((prev)=>{const n=new Set(prev); if(e.target.checked)n.add(m.id); else n.delete(m.id); return n;})} /> select</label>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="font-medium">{m.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.basContentFilename ? `BAS Filename: ${m.basContentFilename}` : 'BAS Filename unavailable'}
                        {m.basContentId ? ` · Content ID: ${m.basContentId}` : ''}
                      </div>
                    </div>
                    <span className={`text-xs font-medium ${publisherClass(m.publisher, m.sourceSystem)}`}>
                      {publisherDisplay(m.publisher)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>Type: {m.type || 'article'}</span>
                    <span>•</span>
                    <span>{m.publishedAt ? new Date(m.publishedAt).toLocaleDateString() : 'Published date unavailable'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(m.matchedFields || []).map((field) => (
                      <Badge key={`${m.id}-field-${field}`} variant="outline" className="bg-blue-50 text-blue-700">
                        matched in {matchFieldLabel(field)}
                      </Badge>
                    ))}
                    {(m.matchedTerms || []).map((term) => (
                      <Badge key={`${m.id}-match-${term}`} variant="outline" className="bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        {term}
                      </Badge>
                    ))}
                    {(m.excludedTerms || []).map((term) => (
                      <Badge key={`${m.id}-exclude-${term}`} variant="outline" className="bg-red-50 text-red-700">
                        <XCircle className="h-3 w-3" />
                        {term}
                      </Badge>
                    ))}
                  </div>
                  {(m.matchContexts || []).length ? (
                    <div className="space-y-2">
                      {(m.matchContexts || []).map((context) => (
                        <p key={`${m.id}-context-${context.field}`} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          <span className="font-semibold text-slate-950">{context.label}:</span> {context.snippet}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {m.evidence ? <p className="rounded-md bg-primary/5 px-3 py-2 text-sm text-foreground/90">{m.evidence}</p> : null}
                  {!(m.matchContexts || []).length ? (
                    <p className="text-sm text-muted-foreground">{m.snippet || 'No snippet available.'}</p>
                  ) : null}
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => openDetails(m)}>View Details</Button>
                </div>
              ))}

            </div>
          </div>
        </section>
      ) : null}

      <section className="hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">{method === 'search' ? 'Standard Search criteria' : 'AI Scan criteria'}</h2>
          <button type="button" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700">
            <HelpCircle className="h-4 w-4" />
            Search tips
          </button>
        </div>

        {method === 'search' ? (
          <>
            <div className="mb-5 flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50/50 px-4 py-3 text-sm text-slate-600">
              <HelpCircle className="h-4 w-4 shrink-0 text-blue-700" />
              <span>Use quotation marks for exact phrases. Exclude terms to remove unwanted matches.</span>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-950">Include terms</label>
                <p className="text-xs text-slate-500">Words or exact phrases the content must contain</p>
                <div className="relative">
                  <Input
                    value={includeTerms}
                    onChange={(e) => setIncludeTerms(e.target.value)}
                    className="h-12 bg-white pr-10 shadow-sm"
                    placeholder='"2025 mileage rate"'
                  />
                  {includeTerms ? (
                    <button type="button" onClick={() => setIncludeTerms('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Clear include terms">
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-950">Exclude terms</label>
                <p className="text-xs text-slate-500">Remove content containing these words or phrases</p>
                <div className="relative">
                  <Input
                    value={excludeTerms}
                    onChange={(e) => setExcludeTerms(e.target.value)}
                    className="h-12 bg-white pr-10 shadow-sm"
                    placeholder='"2026 mileage rate"'
                  />
                  {excludeTerms ? (
                    <button type="button" onClick={() => setExcludeTerms('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Clear exclude terms">
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-slate-500">AI Scan finds related ideas, themes, and coverage gaps, not only exact keywords.</p>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-950">What do you want to analyze?</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[128px] w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-3 text-sm leading-6 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Find recent content about retirement income strategies and identify topics we may be under-covering."
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-950">Try an example</div>
              <div className="flex flex-wrap gap-2">
                {[
                  'Compare topic coverage',
                  'Find outdated content',
                  'Identify content gaps',
                ].map((example) => (
                  <Button key={example} type="button" variant="outline" size="sm" onClick={() => setPrompt(example)}>
                    {example}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-950">Analysis focus</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['relevant', 'Relevant content'],
                  ['gaps', 'Coverage gaps'],
                  ['outdated', 'Outdated content'],
                  ['duplicates', 'Duplicate themes'],
                ].map(([key, label]) => {
                  const active = aiFocus[key as keyof typeof aiFocus];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAiFocus((value) => ({ ...value, [key]: !active }))}
                      className={`flex items-center gap-3 rounded-md border p-3 text-left text-sm font-medium transition ${active ? 'border-blue-500 bg-blue-50 text-slate-950 ring-1 ring-blue-500' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'}`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-end gap-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-950">Publisher</label>
            <select className="h-10 min-w-[240px] rounded-md border border-slate-200 bg-white px-3 text-sm" value={publisher} onChange={(e) => setPublisher(e.target.value)}>
              <option value="all">All publishers</option>
              <option value="broadridge-forefield">broadridge-forefield</option>
              <option value="publisher-content">publisher-content</option>
              <option value="custom-content">custom-content</option>
            </select>
          </div>
          {method === 'search' ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-950">Match logic</label>
                <select className="h-10 min-w-[260px] rounded-md border border-slate-200 bg-white px-3 text-sm" value={matchMode} onChange={(e) => setMatchMode(e.target.value as 'all' | 'any')}>
                  <option value="all">Match all include terms</option>
                  <option value="any">Match any include terms</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-950">Search in</label>
                <select className="h-10 min-w-[240px] rounded-md border border-slate-200 bg-white px-3 text-sm" defaultValue="all">
                  <option value="all">All content fields</option>
                </select>
              </div>
              <Button type="button" variant="outline" className="h-10 gap-2">
                <Calendar className="h-4 w-4" />
                Any date
              </Button>
              <Button type="button" variant="outline" className="h-10 gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                More filters
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-950">Date range</label>
                <select className="h-10 min-w-[170px] rounded-md border border-slate-200 bg-white px-3 text-sm" value={aiDateRange} onChange={(e) => setAiDateRange(e.target.value)}>
                  <option value="12m">Past 12 months</option>
                  <option value="6m">Past 6 months</option>
                  <option value="all">Any date</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-950">Content type</label>
                <select className="h-10 min-w-[170px] rounded-md border border-slate-200 bg-white px-3 text-sm" value={aiContentType} onChange={(e) => setAiContentType(e.target.value)}>
                  <option value="all">All types</option>
                  <option value="article">Articles</option>
                  <option value="topic">Topic discussions</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-950">Depth</label>
                <select className="h-10 min-w-[170px] rounded-md border border-slate-200 bg-white px-3 text-sm" value={analyzeDepth} onChange={(e) => setAnalyzeDepth(e.target.value as 'quick' | 'deep')}>
                  <option value="quick">AI Quick Scan</option>
                  <option value="deep">AI Deep Scan</option>
                </select>
              </div>
              <Button type="button" variant="outline" className="h-10 gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Advanced options
              </Button>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            {method === 'search'
              ? `${includeCount} include term${includeCount === 1 ? '' : 's'} · ${excludeCount} exclusion${excludeCount === 1 ? '' : 's'}`
              : 'AI may return conceptually related content.'}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={clearCriteria}>Clear</Button>
            <Button onClick={run} disabled={loading || (method === 'analyze' ? !prompt.trim() : !includeTerms.trim())} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? (method === 'analyze' ? `${scanModeLabel} running...` : 'Running search...') : method === 'analyze' ? 'Run AI scan' : 'Run scan'}
            </Button>
          </div>
        </div>
      </section>

      <section className="hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-950">Scan results</h2>
            <Badge variant="secondary">{resultTotal || 0}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => {
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'audit-results.csv'; a.click();
              URL.revokeObjectURL(url);
            }} disabled={!result?.matches?.length}>Export CSV</Button>
            <Button variant="outline" onClick={markNeedsUpdate} disabled={!selectedIds.size}>Mark needs Update</Button>
          </div>
        </div>
        <div className="space-y-3 p-5">
          {loading ? (
            <div className="flex min-h-[150px] flex-col items-center justify-center gap-3 text-center text-sm text-slate-500">
              <Loader2 className="h-9 w-9 animate-spin text-blue-700" />
              <div className="font-semibold text-slate-950">{scanModeLabel} in progress</div>
              <div>{scanRunningDetail}</div>
            </div>
          ) : !result ? (
            <div className="flex min-h-[150px] flex-col items-center justify-center gap-3 text-center">
              <FileSearch className="h-14 w-14 text-slate-500" />
              <div className="text-base font-semibold text-slate-950">Run a scan to review coverage</div>
              <p className="max-w-md text-sm text-slate-500">Matching content, coverage signals, and update opportunities will appear here.</p>
            </div>
          ) : null}
          {result && !loading && !error && (result?.matches?.length ?? 0) === 0 && (
            <div className="rounded-md border border-slate-200 p-4 text-sm text-slate-500">No matches found for this query. Try broader wording or remove exclusions.</div>
          )}
          {result && !loading && !error ? (
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-700 text-white">
                  <Search className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{resultTotal} matches</p>
                  <p className="text-xs text-slate-500">{scanned} source items scanned</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-50 text-violet-700">
                  {method === 'analyze' ? <Sparkles className="h-4 w-4" /> : <FileSearch className="h-4 w-4" />}
                </span>
                <div>
                  <p className="text-sm font-semibold">{result?.mode === 'ai-analyze' ? (result?.structured?.depth === 'deep' ? 'AI Deep Scan' : scanModeLabel) : scanModeLabel}</p>
                  <p className="text-xs text-slate-500">
                    {result?.parserUsed === 'fallback'
                      ? 'Fallback parser'
                      : method === 'search'
                        ? 'Deterministic parser'
                        : `${candidateCount ?? 0} AI candidates${chunkCount ? ` / ${chunkCount} batches` : ''}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Criteria parsed</p>
                  <p className="text-xs text-slate-500">
                    {(result?.structured?.mustInclude || []).length} include / {(result?.structured?.mustExclude || []).length} exclude
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          {result?.structured ? (
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              {(result.structured.mustInclude || []).map((term: string) => (
                <Badge key={`include-${term}`} variant="outline" className="bg-emerald-50 text-emerald-700">
                  include: {term}
                </Badge>
              ))}
              {(result.structured.mustExclude || []).map((term: string) => (
                <Badge key={`exclude-${term}`} variant="outline" className="bg-red-50 text-red-700">
                  exclude: {term}
                </Badge>
              ))}
              {result?.summary ? <span className="basis-full pt-1">{result.summary}</span> : null}
            </div>
          ) : null}

        {matches.map((m: Match) => (
          <div key={m.id} className="rounded border p-3 space-y-2">
            <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={(e)=>setSelectedIds((prev)=>{const n=new Set(prev); if(e.target.checked)n.add(m.id); else n.delete(m.id); return n;})} /> select</label>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1">
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-muted-foreground">
                  {m.externalId ? `External Article ID: ${m.externalId}` : 'External Article ID unavailable'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {'confidence' in m && typeof (m as any).confidence === 'number' && (
                  <Badge
                    className={
                      (m as any).confidence >= 0.8
                        ? 'bg-green-600 text-white'
                        : (m as any).confidence >= 0.5
                          ? 'bg-yellow-600 text-white'
                          : 'bg-muted text-foreground'
                    }
                  >
                    {Math.round(((m as any).confidence || 0) * 100)}%
                  </Badge>
                )}
                <span className={`text-xs font-medium ${publisherClass(m.publisher, m.sourceSystem)}`}>
                  {publisherDisplay(m.publisher)}
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <User className="h-3 w-3" />
              <span>Type: {m.type || 'article'}</span>
              <span>•</span>
              <span>{m.publishedAt ? new Date(m.publishedAt).toLocaleDateString() : 'Published date unavailable'}</span>
            </div>
            {'reason' in m && (m as any).reason && (
              <p className="text-sm text-foreground/90">Reason: {m.reason}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {(m.matchedTerms || []).map((term) => (
                <Badge key={`${m.id}-match-${term}`} variant="outline" className="bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  {term}
                </Badge>
              ))}
              {(m.excludedTerms || []).map((term) => (
                <Badge key={`${m.id}-exclude-${term}`} variant="outline" className="bg-red-50 text-red-700">
                  <XCircle className="h-3 w-3" />
                  {term}
                </Badge>
              ))}
            </div>
            {m.evidence ? (
              <p className="rounded-md bg-primary/5 px-3 py-2 text-sm text-foreground/90">{m.evidence}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">{m.snippet || 'No snippet available.'}</p>
            <div>
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => openDetails(m)}>View Details</Button>
            </div>
          </div>
        ))}
        </div>
      </section>

      <ContentDetail
        content={selectedContent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
