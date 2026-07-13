'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/page-header';
import { CheckCircle2, FileSearch, Loader2, Search, Sparkles, User, XCircle } from 'lucide-react';
import { ContentDetail } from '@/components/source-content/content-detail';
import type { SourceContent } from '@/lib/types/content';
import { toast } from 'sonner';

type Match = {
  id: string;
  externalId?: string | null;
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
  reason?: string;
  evidence?: string;
  confidence?: number;
};

export default function AuditPage() {
  const [prompt, setPrompt] = useState('');
  const [includeTerms, setIncludeTerms] = useState('');
  const [excludeTerms, setExcludeTerms] = useState('');
  const [publisher, setPublisher] = useState('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [method, setMethod] = useState<'search' | 'analyze'>('search');
  const [matchMode, setMatchMode] = useState<'all' | 'any'>('all');
  const [analyzeDepth, setAnalyzeDepth] = useState<'quick' | 'deep'>('quick');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<SourceContent | null>(null);

  const run = async () => {
    setLoading(true);
    setError('');
    setSelectedIds(new Set());
    try {
      const endpoint = method === 'analyze' ? '/api/audit/analyze' : '/api/audit/query';
      const searchPrompt = method === 'search'
        ? `include ${includeTerms || prompt}${excludeTerms ? ` but not ${excludeTerms}` : ''}`
        : prompt;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: searchPrompt,
          publisher,
          limit: method === 'search' ? 5000 : analyzeDepth === 'deep' ? 5000 : 3000,
          mode: matchMode,
          depth: analyzeDepth,
          mustInclude: includeTerms,
          mustExclude: excludeTerms,
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

  const csv = useMemo(() => {
    const rows: Match[] = result?.matches || [];
    const head = ['id','title','publisher','sourceSystem','publishedAt','snippet'];
    const lines = rows.map((r) => [r.id,r.title,r.publisher||'',r.sourceSystem||'',r.publishedAt||'',(r.snippet||'').replace(/"/g,'""')].map((v)=>`"${String(v)}"`).join(','));
    return [head.join(','), ...lines].join('\n');
  }, [result]);

  const publisherDisplay = (publisher: string | null) => {
    if (publisher === 'broadridge-forefield') return 'Broadridge Forefield';
    if (publisher === 'publisher-content') return 'Publisher Content';
    if (publisher === 'sample') return 'Sample';
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
    };
    setSelectedContent(content);
    setDetailOpen(true);
  };

  const markNeedsUpdate = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const response = await fetch('/api/audit/mark', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, note: prompt || includeTerms }) });
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
    ? 'Scanning filenames, titles, summaries, tags, and normalized body text across the source inventory.'
    : analyzeDepth === 'deep'
      ? 'Collecting broad candidates across the source inventory, then applying deeper AI classification in batches.'
      : 'Collecting broad candidates across the source inventory, then applying focused AI classification to the strongest candidates.';

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <PageHeader
        eyebrow="Content intelligence"
        title="Content Scan"
        description="Search and analyze source coverage before building new advisor campaigns."
        metrics={[
          {
            label: 'Audit source coverage',
            detail: 'Search plus AI-assisted analysis.',
            icon: FileSearch,
          },
        ]}
      />

      <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="inline-flex items-center rounded-lg bg-muted p-1 text-xs">
          <button
            className={`px-3 py-1.5 rounded-md transition inline-flex items-center gap-1.5 ${method === 'search' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setMethod('search')}
            type="button"
          >
            <Search className="h-3.5 w-3.5" />
            Standard Search
          </button>
          <button
            className={`px-3 py-1.5 rounded-md transition inline-flex items-center gap-1.5 ${method === 'analyze' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setMethod('analyze')}
            type="button"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Scan
          </button>
        </div>

        <div className="rounded-md border p-3 text-xs bg-muted/40 border-muted-foreground/20 text-muted-foreground">
          {method === 'search' ? (
            <>
              <div className="font-medium text-foreground mb-1">How Standard Search works</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>Best for exact term/phrase matching across filenames, titles, summaries, tags, and body text.</li>
                <li>Use quotes for exact phrases (example: "standard mileage rate").</li>
                <li>Use exclusions like <code>but not "2026"</code> to filter out matches.</li>
              </ul>
            </>
          ) : (
            <>
              <div className="font-medium text-foreground mb-1">How AI Scan works</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>AI Quick Scan reviews the strongest candidates after a broad inventory pass.</li>
                <li>AI Deep Scan uses a wider AI candidate set and smaller batches for more nuanced review.</li>
                <li>Use AI Scan when the request is conceptual, not just keyword matching.</li>
              </ul>
            </>
          )}
        </div>

        {method === 'search' ? (
          <div className="grid md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Include terms</label>
              <Input
                value={includeTerms}
                onChange={(e) => setIncludeTerms(e.target.value)}
                className="bg-white"
                placeholder='"2025 mileage rate"'
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Exclude terms</label>
              <Input
                value={excludeTerms}
                onChange={(e) => setExcludeTerms(e.target.value)}
                className="bg-white"
                placeholder='"2026 mileage rate"'
              />
            </div>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="bg-white"
              placeholder='e.g. list content that mentions 2025 mileage rate but not 2026 mileage rate'
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <select className="border rounded px-2 bg-white" value={publisher} onChange={(e) => setPublisher(e.target.value)}>
            <option value="all">All publishers</option>
            <option value="broadridge-forefield">Broadridge Forefield</option>
            <option value="publisher-content">Publisher Content</option>
            <option value="sample">Sample</option>
          </select>
          {method === 'search' && (
            <select className="border rounded px-2 bg-white text-sm" value={matchMode} onChange={(e) => setMatchMode(e.target.value as 'all' | 'any')}>
              <option value="all">Match all include terms</option>
              <option value="any">Match any include term</option>
            </select>
          )}
          {method === 'analyze' && (
            <select className="border rounded px-2 bg-white text-sm" value={analyzeDepth} onChange={(e) => setAnalyzeDepth(e.target.value as 'quick' | 'deep')}>
              <option value="quick">AI Quick Scan</option>
              <option value="deep">AI Deep Scan</option>
            </select>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center pt-2">
          <Button onClick={run} disabled={loading || (method === 'analyze' ? !prompt.trim() : !includeTerms.trim())}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {method === 'analyze' ? `${scanModeLabel} running...` : 'Running search...'}
              </>
            ) : method === 'analyze' ? `Run ${scanModeLabel}` : 'Run Standard Search'}
          </Button>
          <Button variant="outline" onClick={() => {
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'audit-results.csv'; a.click();
          URL.revokeObjectURL(url);
        }} disabled={!result?.matches?.length}>Export CSV</Button>
        <Button variant="outline" onClick={markNeedsUpdate} disabled={!selectedIds.size}>Mark Needs Update</Button>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground rounded border p-3">
          <div className="font-medium text-foreground">{scanModeLabel} in progress</div>
          <div className="mt-1">{scanRunningDetail}</div>
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive rounded border border-destructive/30 bg-destructive/10 p-3">{error}</div>
      )}

      {result && !loading && !error && (
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-sm md:grid-cols-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Search className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">{resultTotal} matches</p>
              <p className="text-xs text-muted-foreground">{scanned} source items scanned</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              {method === 'analyze' ? <Sparkles className="h-4 w-4" /> : <FileSearch className="h-4 w-4" />}
            </span>
            <div>
              <p className="text-sm font-semibold">{result?.mode === 'ai-analyze' ? (result?.structured?.depth === 'deep' ? 'AI Deep Scan' : scanModeLabel) : scanModeLabel}</p>
              <p className="text-xs text-muted-foreground">
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
              <p className="text-xs text-muted-foreground">
                {(result?.structured?.mustInclude || []).length} include / {(result?.structured?.mustExclude || []).length} exclude
              </p>
            </div>
          </div>
        </div>
      )}

      {result?.structured && (
        <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground shadow-sm">
          <div className="flex flex-wrap gap-2">
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
          </div>
          {result?.summary && <div className="mt-3">{result.summary}</div>}
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-border bg-card p-5 shadow-sm">
        {result && !loading && !error && (result?.matches?.length ?? 0) === 0 && (
          <div className="text-sm text-muted-foreground rounded border p-3">No matches found for this query. Try broader wording or remove exclusions.</div>
        )}

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

      <ContentDetail
        content={selectedContent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
