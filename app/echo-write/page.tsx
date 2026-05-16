'use client';

import './echowrite.css';

import { useMemo, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EchoWriteEditor } from '@/components/echowrite/echowrite-editor';
import { buildAttribution } from '@/lib/echowrite/attribution';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ContentDetail } from '@/components/source-content/content-detail';
import type { SourceContent } from '@/lib/types/content';

export default function EchoWritePage() {
  const [prompt, setPrompt] = useState('');
  const [writingStyle, setWritingStyle] = useState<'professional' | 'fun' | 'educational'>('professional');
  const [contentType, setContentType] = useState<'article' | 'video-script'>('article');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [targetWordCount, setTargetWordCount] = useState('');
  const [maxSources, setMaxSources] = useState(6);

  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [hoverSourceId, setHoverSourceId] = useState<string | null>(null);
  const [hoverSnippet, setHoverSnippet] = useState<string | null>(null);
  const [showMatches, setShowMatches] = useState(true);
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const [promptOpen, setPromptOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailContent, setDetailContent] = useState<SourceContent | null>(null);

  const { spans, citationMap } = useMemo(() => {
    return buildAttribution(content, sources);
  }, [content, sources]);

  const sourceSnippetMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of spans) {
      if (!s.sourceId || !s.snippet) continue;
      if (map.has(s.sourceId)) continue;
      map.set(s.sourceId, s.snippet);
    }
    return map;
  }, [spans]);

  const sourcesWithCitation = useMemo(() => {
    const list = [...sources]
      .map((s) => ({ ...s, citationNumber: citationMap.get(s.id) || null }))
      .filter((s) => s.citationNumber);

    list.sort((a, b) => (a.citationNumber || 9999) - (b.citationNumber || 9999));
    return list;
  }, [sources, citationMap]);

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
          maxSources,
          targetWordCount: targetWordCount ? Number(targetWordCount) : undefined,
        }),
      });
      const json = await res.json();
      setContent(json.content || '');
      setSources(json.sources || []);
      setLastPrompt(String(json?.debug?.prompt || ''));
      setHoverSourceId(null);
      setHoverSnippet(null);
    } finally {
      setLoading(false);
    }
  };

  const openSourceDetail = async (id: string) => {
    const res = await fetch(`/api/source-content/${id}`);
    const json = await res.json();
    // /api/source-content/[id] returns the content object directly (not wrapped).
    setDetailContent(json || null);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">EchoWrite</h1>
        <p className="text-muted-foreground">AI-assisted editorial generation grounded in your source content library.</p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <Textarea
          placeholder="Describe the content you want generated..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Writing Style</div>
            <Select value={writingStyle} onValueChange={(v: any) => setWritingStyle(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="fun">Fun</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Content Type</div>
            <Select value={contentType} onValueChange={(v: any) => setContentType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="video-script">Video Script</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Length</div>
            <Select value={length} onValueChange={(v: any) => setLength(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="long">Long</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Target Word Count</div>
            <Input value={targetWordCount} onChange={(e) => setTargetWordCount(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Max Articles to Reference</div>
            <Input
              type="number"
              min={0}
              max={12}
              value={maxSources}
              onChange={(e) => setMaxSources(Math.max(0, Math.min(12, Number(e.target.value) || 0)))}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={generate} disabled={loading || !prompt.trim()}>
            {loading ? 'Generating...' : 'Generate'}
          </Button>
          <Button variant="outline" onClick={generate} disabled={loading || !prompt.trim()}>
            Regenerate
          </Button>
          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHowItWorksOpen(true)}
            title="How EchoWrite works (retrieval + grounding + highlights)"
          >
            <span className="text-xs font-semibold">i</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPromptOpen(true)}
            title="View last generation prompt"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
        <DialogContent className="max-w-3xl w-[92vw]">
          <DialogHeader>
            <DialogTitle>How EchoWrite works</DialogTitle>
            <DialogDescription>
              Retrieval + grounding + evidence highlighting.
            </DialogDescription>
          </DialogHeader>
          <pre className="text-xs whitespace-pre-wrap break-words max-h-[65vh] overflow-auto rounded border bg-muted/20 p-3">
{`Current EchoWrite strategy is “lightweight RAG” (semantic-ish retrieval + grounded generation), but it’s not embeddings-based yet.

1) Retrieval (which sources get used)
When you click Generate, /api/echo-write does:
- pulls up to 1000 source_content rows (most recent first)
- scores them against your prompt using simple lexical matching:
  - phrase match + token overlap in title and body
- sorts by score
- takes the top 12 as “retrieved” candidates

So yes: we’re effectively grounding on max 12 sources per generation right now.

2) Grounding / prompt context
Those top sources are concatenated into the SOURCE CONTEXT block (title + some metadata + body snippet) and sent to OpenAI.

3) Generation
We ask the model to:
- synthesize (not copy)
- avoid hallucinations
- follow strict formatting rules (paragraph spacing, headings, etc.)

4) Evidence/highlights after generation
Separately (client-side), we:
- split the generated output into sentences
- run lexical overlap against the returned source snippets
- assign citations/highlights to the best matching source per sentence
- show only cited sources in the right panel`}
          </pre>
        </DialogContent>
      </Dialog>

      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Last generation prompt</DialogTitle>
            <DialogDescription>
              This is the full prompt used to generate the most recent EchoWrite output.
            </DialogDescription>
          </DialogHeader>
          <pre className="text-xs whitespace-pre-wrap break-words max-h-[65vh] overflow-auto rounded border bg-muted/20 p-3">
            {lastPrompt || 'No prompt captured yet. Generate content first.'}
          </pre>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Generated Output</h2>
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(content || '')}>Copy</Button>
          </div>

          <EchoWriteEditor
            value={content}
            spans={spans}
            onChange={setContent}
            showMatches={showMatches}
            hoveredSourceId={hoverSourceId}
            onHoverSpan={(sourceId, snippet) => {
              setHoverSourceId(sourceId);
              setHoverSnippet(snippet);
            }}
          />
        </div>

        <div className="lg:col-span-2 w-4/5 justify-self-end rounded-lg border p-0 overflow-hidden">
          <div className="shrink-0 p-4 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm">Sources Used ({sourcesWithCitation.length})</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Show matches</span>
              <Switch checked={showMatches} onCheckedChange={(v) => setShowMatches(Boolean(v))} />
            </div>
          </div>


          <div className="flex-1 overflow-auto p-3 space-y-2.5 max-h-[720px]">
            {sourcesWithCitation.length ? sourcesWithCitation.map((s) => {
              const isHovered = hoverSourceId && s.id === hoverSourceId;
              const n = s.citationNumber || 0;
              const colors = n ? [
                { bg: 'bg-[#f3e8ff]', darkBg: 'dark:bg-purple-950/50', badge: 'bg-[#a855f7]', border: 'border-l-[#a855f7]', ring: 'ring-[#a855f7]' },
                { bg: 'bg-[#fef9c3]', darkBg: 'dark:bg-yellow-950/50', badge: 'bg-[#eab308]', border: 'border-l-[#eab308]', ring: 'ring-[#eab308]' },
                { bg: 'bg-[#fee2e2]', darkBg: 'dark:bg-red-950/50', badge: 'bg-[#f87171]', border: 'border-l-[#f87171]', ring: 'ring-[#f87171]' },
                { bg: 'bg-[#dcfce7]', darkBg: 'dark:bg-green-950/50', badge: 'bg-[#22c55e]', border: 'border-l-[#22c55e]', ring: 'ring-[#22c55e]' },
                { bg: 'bg-[#dbeafe]', darkBg: 'dark:bg-blue-950/50', badge: 'bg-[#3b82f6]', border: 'border-l-[#3b82f6]', ring: 'ring-[#3b82f6]' },
              ][(n - 1) % 5] : null;

              return (
                <div
                  key={s.id}
                  className={`p-4 min-h-[140px] rounded-lg bg-card border-l-4 ${colors?.border || 'border-l-border'} transition-all cursor-pointer ${isHovered ? `ring-2 ${colors?.ring || 'ring-[#7c3aed]'} ring-offset-1 ring-offset-background` : ''}`}
                  onMouseEnter={() => {
                    setHoverSourceId(s.id);
                    setHoverSnippet(sourceSnippetMap.get(s.id) || null);
                  }}
                  onMouseLeave={() => {
                    setHoverSourceId(null);
                    setHoverSnippet(null);
                  }}
                >
                  <div className="flex gap-2.5">
                    {n ? (
                      <span className={`${colors?.badge} text-white text-xs w-5 h-5 rounded flex items-center justify-center shrink-0 font-semibold`}>
                        {n}
                      </span>
                    ) : null}

                    <div className="flex-1 min-w-0 flex flex-col">
                      <h4 className="font-medium text-sm leading-tight text-foreground">{s.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.designation || 'n/a'}
                      </p>

                      {showMatches ? (
                        <p className={`text-xs mt-2 italic line-clamp-3 ${colors ? `${colors.bg} ${colors.darkBg} rounded px-2 py-1 text-foreground` : 'text-muted-foreground'}`}>
                          “{sourceSnippetMap.get(s.id) || 'n/a'}”
                        </p>
                      ) : null}

                      <div className="mt-auto pt-3">
                        <div className="border-t pt-2 flex items-center justify-between gap-2">
                          <div className="text-[10px] text-muted-foreground">
                            BasContentId: {s.basContentId || 'n/a'}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSourceDetail(String(s.id));
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) : <div className="text-muted-foreground p-3">No sources yet.</div>}
          </div>

          <div className="p-3 text-xs text-muted-foreground border-t bg-muted/10">
            Sources were automatically matched to highlighted content.
          </div>
        </div>
      </div>
      <ContentDetail
        content={detailContent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
