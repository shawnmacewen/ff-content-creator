'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Search, Sparkles } from 'lucide-react';

type Match = {
  id: string;
  title: string;
  publisher: string | null;
  sourceSystem: string | null;
  publishedAt: string | null;
  snippet: string;
  score: number;
};

export default function AuditPage() {
  const [prompt, setPrompt] = useState('');
  const [publisher, setPublisher] = useState('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [method, setMethod] = useState<'search' | 'analyze'>('search');
  const [matchMode, setMatchMode] = useState<'all' | 'any'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>('');

  const run = async () => {
    setLoading(true);
    setError('');
    setSelectedIds(new Set());
    try {
      const endpoint = method === 'analyze' ? '/api/audit/analyze' : '/api/audit/query';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, publisher, limit: 200, mode: matchMode }),
      });
      const body = await res.json();
      setResult(body);
      if (!res.ok || body?.ok === false) {
        setError(body?.error || `Audit failed (${res.status})`);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
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

  const markNeedsUpdate = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    await fetch('/api/audit/mark', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, note: prompt }) });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content Audit</h1>
        <p className="text-muted-foreground">Type what you want to find. AI will convert your request into DB search rules.</p>
      </div>

      <div className="flex gap-2 items-center">
        <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. list content that mentions 2025 mileage rate but not 2026 mileage rate" />
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
            AI Analyze
          </button>
        </div>
        <select className="border rounded px-2 bg-background" value={publisher} onChange={(e) => setPublisher(e.target.value)}>
          <option value="all">All publishers</option>
          <option value="broadridge-forefield">Broadridge Forefield</option>
          <option value="publisher-content">Publisher Content</option>
          <option value="sample">Sample</option>
        </select>
        <select className="border rounded px-2 bg-background text-sm" value={matchMode} onChange={(e) => setMatchMode(e.target.value as 'all' | 'any')}>
          <option value="all">Match all include terms</option>
          <option value="any">Match any include term</option>
        </select>
        <Button onClick={run} disabled={loading || !prompt.trim()}>{loading ? (method === 'analyze' ? 'Analyzing...' : 'Running...') : (method === 'analyze' ? 'Run AI Analyze' : 'Run Audit')}</Button>
        <Button variant="outline" onClick={() => {
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'audit-results.csv'; a.click();
          URL.revokeObjectURL(url);
        }} disabled={!result?.matches?.length}>Export CSV</Button>
        <Button variant="outline" onClick={markNeedsUpdate} disabled={!selectedIds.size}>Mark Needs Update</Button>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground rounded border p-3">Running audit...</div>
      )}

      {error && (
        <div className="text-sm text-destructive rounded border border-destructive/30 bg-destructive/10 p-3">{error}</div>
      )}

      {result?.structured && (
        <div className="text-xs text-muted-foreground rounded border p-3 space-y-1">
          <div>Parsed query: <code>{JSON.stringify(result.structured)}</code></div>
          <div>Parser: <strong>{result?.parserUsed === 'fallback' ? 'Fallback (AI parse failed)' : 'AI parser'}</strong></div>
          <div>Matches: <strong>{result?.total ?? result?.matches?.length ?? 0}</strong> · Scanned: <strong>{result?.scanned ?? 0}</strong></div>
        </div>
      )}

      <div className="space-y-3">
        {result && !loading && !error && (result?.matches?.length ?? 0) === 0 && (
          <div className="text-sm text-muted-foreground rounded border p-3">No matches found for this query. Try broader wording or remove exclusions.</div>
        )}

        {(result?.matches || []).map((m: Match) => (
          <div key={m.id} className="rounded border p-3 space-y-2">
            <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={(e)=>setSelectedIds((prev)=>{const n=new Set(prev); if(e.target.checked)n.add(m.id); else n.delete(m.id); return n;})} /> select</label>
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{m.title}</div>
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
                <Badge variant="outline">{m.publisher || 'Unavailable'}</Badge>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{m.publishedAt ? new Date(m.publishedAt).toLocaleDateString() : 'Published date unavailable'}</div>
            {'reason' in m && (m as any).reason && (
              <p className="text-sm text-foreground/90">Reason: {(m as any).reason}</p>
            )}
            <p className="text-sm text-muted-foreground">{m.snippet || 'No snippet available.'}</p>
            <div>
              <Link href={`/source-content`} className="text-xs text-blue-500 hover:underline">Open in Source Content</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
