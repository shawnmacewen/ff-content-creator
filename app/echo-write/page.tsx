'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const evidencePalette = [
  'bg-blue-500/15 border-blue-500/40 text-blue-200',
  'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
  'bg-violet-500/15 border-violet-500/40 text-violet-200',
  'bg-amber-500/15 border-amber-500/40 text-amber-200',
  'bg-rose-500/15 border-rose-500/40 text-rose-200',
  'bg-cyan-500/15 border-cyan-500/40 text-cyan-200',
];

function sentenceSplit(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function overlapScore(a: string, b: string) {
  const clean = (x: string) => x.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const aSet = new Set(clean(a).split(/\s+/).filter((t) => t.length > 3));
  const bSet = new Set(clean(b).split(/\s+/).filter((t) => t.length > 3));
  if (!aSet.size || !bSet.size) return 0;
  let overlap = 0;
  for (const t of aSet) if (bSet.has(t)) overlap += 1;
  return overlap;
}

export default function EchoWritePage() {
  const [prompt, setPrompt] = useState('');
  const [writingStyle, setWritingStyle] = useState<'professional' | 'fun' | 'educational'>('professional');
  const [contentType, setContentType] = useState<'article' | 'video-script'>('article');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [targetWordCount, setTargetWordCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [activeEvidence, setActiveEvidence] = useState<number | null>(null);

  const evidence = useMemo(() => {
    const claims = sentenceSplit(content).slice(0, 8);
    if (!claims.length || !sources.length) return [] as any[];
    return claims.map((claim, idx) => {
      const best = [...sources]
        .map((s) => {
          const snippet = String(s.bodySnippet || '');
          const score = overlapScore(claim, snippet);
          return { source: s, score, snippet: snippet.slice(0, 260) };
        })
        .sort((a, b) => b.score - a.score)[0];
      return {
        id: idx,
        claim,
        colorClass: evidencePalette[idx % evidencePalette.length],
        sourceId: best?.source?.id,
        sourceTitle: best?.source?.title,
        snippet: best?.snippet || '',
        score: best?.score || 0,
      };
    }).filter((x) => x.score > 0);
  }, [content, sources]);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/echo-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          writingStyle,
          contentType,
          length,
          targetWordCount: targetWordCount ? Number(targetWordCount) : undefined,
        }),
      });
      const json = await res.json();
      setContent(json.content || '');
      setSources(json.sources || []);
      setActiveEvidence(null);
    } finally {
      setLoading(false);
    }
  };

  const contentSentences = sentenceSplit(content);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">EchoWrite</h1>
        <p className="text-muted-foreground">AI-assisted editorial generation grounded in your source content library.</p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <Textarea placeholder="Describe the content you want generated..." value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><div className="text-xs text-muted-foreground mb-1">Writing Style</div><Select value={writingStyle} onValueChange={(v: any) => setWritingStyle(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="professional">Professional</SelectItem><SelectItem value="fun">Fun</SelectItem><SelectItem value="educational">Educational</SelectItem></SelectContent></Select></div>
          <div><div className="text-xs text-muted-foreground mb-1">Content Type</div><Select value={contentType} onValueChange={(v: any) => setContentType(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="article">Article</SelectItem><SelectItem value="video-script">Video Script</SelectItem></SelectContent></Select></div>
          <div><div className="text-xs text-muted-foreground mb-1">Length</div><Select value={length} onValueChange={(v: any) => setLength(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="short">Short</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="long">Long</SelectItem></SelectContent></Select></div>
          <div><div className="text-xs text-muted-foreground mb-1">Target Word Count</div><Input value={targetWordCount} onChange={(e) => setTargetWordCount(e.target.value)} placeholder="Optional" /></div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={generate} disabled={loading || !prompt.trim()}>{loading ? 'Generating...' : 'Generate'}</Button>
          <Button variant="outline" onClick={generate} disabled={loading || !prompt.trim()}>Regenerate</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Generated Output</h2>
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(content || '')}>Copy</Button>
          </div>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={16} placeholder="Generated content will appear here." />
          {evidence.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-semibold">Color-coded evidence view (left-justified)</div>
              <div className="rounded border p-3 space-y-2 text-sm text-left">
                {contentSentences.map((s, i) => {
                  const match = evidence.find((e) => e.claim === s);
                  return (
                    <div key={`${i}-${s.slice(0, 16)}`} className={match ? `rounded px-2 py-1 border ${match.colorClass}` : ''}>
                      {s}
                    </div>
                  );
                })}
              </div>
              <div className="text-xs font-semibold mb-1">Claim-to-source map</div>
              <div className="flex flex-wrap gap-2">
                {evidence.map((e) => (
                  <button key={e.id} onClick={() => setActiveEvidence(e.id)} className={`text-xs rounded border px-2 py-1 ${e.colorClass} ${activeEvidence === e.id ? 'ring-1 ring-primary' : ''}`}>
                    Claim {e.id + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-lg border p-4">
          <h2 className="text-sm font-semibold mb-2">Referenced Sources</h2>
          <div className="space-y-2 text-sm max-h-[640px] overflow-auto">
            {sources.length ? sources.map((s) => {
              const mapped = evidence.filter((e) => e.sourceId === s.id);
              const activeMatch = mapped.find((m) => m.id === activeEvidence);
              return (
                <div key={s.id} className={`rounded border p-2 ${activeMatch ? activeMatch.colorClass : ''}`}>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.publisher || 'n/a'} • {s.designation || 'n/a'} • score {s.score}</div>
                  {activeMatch && (
                    <div className="mt-2 text-xs">
                      <div className="font-semibold">Matched snippet</div>
                      <div className="text-muted-foreground">{activeMatch.snippet || 'n/a'}</div>
                    </div>
                  )}
                </div>
              );
            }) : <div className="text-muted-foreground">No sources yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
