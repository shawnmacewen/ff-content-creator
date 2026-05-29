'use client';

import './echowrite.css';

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, FileText, Loader2, PenSquare, Save, Settings2, Sparkles } from 'lucide-react';
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
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type EchoWriteSource = {
  id: string;
  title: string;
  publisher?: string | null;
  basContentId?: string | null;
  designation?: string | null;
  publishedAt?: string | null;
  imageUrl?: string | null;
  score?: number;
  matchedTerms?: string[];
  matchedTopicalTerms?: string[];
  matchedAnchorTerms?: string[];
  bodySnippet?: string;
};

function titleFromContent(content: string) {
  const firstLine = content
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  return (firstLine || 'EchoWrite draft').replace(/^#+\s*/, '').slice(0, 100);
}

function subtitleFromContent(content: string) {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => !/^#+\s*/.test(line) && line !== titleFromContent(content))
    ?.replace(/^#+\s*/, '')
    .slice(0, 180);
}

function toneFromWritingStyle(style: 'professional' | 'fun' | 'educational') {
  if (style === 'fun') return 'friendly';
  if (style === 'educational') return 'authoritative';
  return 'professional';
}

export default function EchoWritePage() {
  const [prompt, setPrompt] = useState('');
  const [writingStyle, setWritingStyle] = useState<'professional' | 'fun' | 'educational'>('professional');
  const [contentType, setContentType] = useState<'article' | 'video-script'>('article');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [targetWordCount, setTargetWordCount] = useState('');
  const [maxSources, setMaxSources] = useState(6);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [sources, setSources] = useState<EchoWriteSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hoverSourceId, setHoverSourceId] = useState<string | null>(null);
  const [, setHoverSnippet] = useState<string | null>(null);
  const [showMatches, setShowMatches] = useState(true);
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const [lastModel, setLastModel] = useState<string>('');
  const [promptOpen, setPromptOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailContent, setDetailContent] = useState<SourceContent | null>(null);
  const [detailHighlightSnippets, setDetailHighlightSnippets] = useState<string[]>([]);

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
      .sort((a, b) => {
        const aCitation = a.citationNumber || 9999;
        const bCitation = b.citationNumber || 9999;
        if (aCitation !== bCitation) return aCitation - bCitation;
        return (b.score || 0) - (a.score || 0);
      });

    return list;
  }, [sources, citationMap]);

  const citedSourceCount = useMemo(() => {
    return sourcesWithCitation.filter((s) => s.citationNumber).length;
  }, [sourcesWithCitation]);

  const outputHeroSource = useMemo(() => {
    return sourcesWithCitation.find((source) => source.citationNumber && source.imageUrl)
      || sourcesWithCitation.find((source) => source.imageUrl)
      || sourcesWithCitation[0]
      || null;
  }, [sourcesWithCitation]);

  const outputTitle = useMemo(() => titleFromContent(content), [content]);
  const outputSubtitle = useMemo(() => subtitleFromContent(content), [content]);

  const saveSourceIds = useMemo(() => {
    const citedIds = sourcesWithCitation
      .filter((source) => source.citationNumber)
      .map((source) => source.id);

    return citedIds.length ? citedIds : sources.map((source) => source.id);
  }, [sources, sourcesWithCitation]);

  const groundingStatus = useMemo(() => {
    const totalSentences = spans.length;
    const citedSentences = spans.filter((span) => span.sourceId && span.citationNumber).length;
    const percent = totalSentences ? Math.round((citedSentences / totalSentences) * 100) : 0;

    return {
      totalSentences,
      citedSentences,
      percent,
      hasOutput: Boolean(content.trim()),
      hasRetrievedSources: sources.length > 0,
    };
  }, [content, sources.length, spans]);

  const generate = async () => {
    setLoading(true);
    setError(null);
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
      if (!res.ok) {
        throw new Error(json?.error || 'EchoWrite generation failed');
      }
      setContent(json.content || '');
      setSources(json.sources || []);
      setLastPrompt(String(json?.debug?.prompt || ''));
      setLastModel(String(json?.debug?.model || ''));
      setHoverSourceId(null);
      setHoverSnippet(null);
      toast.success('EchoWrite draft generated');
    } catch (err: any) {
      const message = err?.message || 'EchoWrite generation failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = async () => {
    await navigator.clipboard.writeText(content || '');
    toast.success('Output copied');
  };

  const saveDraft = async () => {
    if (!content.trim()) return;

    setSaving(true);
    try {
      const response = await fetch('/api/generated-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: contentType === 'video-script' ? 'video-script' : 'article',
          title: titleFromContent(content),
          content,
          sourceContentIds: saveSourceIds,
          prompt,
          tone: toneFromWritingStyle(writingStyle),
          status: 'draft',
          versionNote: 'Saved from EchoWrite',
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.error || 'Failed to save EchoWrite draft');
      }

      toast.success('Saved to Saved Content');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save EchoWrite draft');
    } finally {
      setSaving(false);
    }
  };

  const openSourceDetail = async (id: string) => {
    const res = await fetch(`/api/source-content/${id}`);
    const json = await res.json();
    // /api/source-content/[id] returns the content object directly (not wrapped).
    setDetailContent(json || null);

    // EchoWrite evidence: collect snippet strings already computed client-side.
    const snippets = spans
      .filter((s) => String(s.sourceId || '') === String(id) && s.snippet)
      .map((s) => String(s.snippet || ''));
    setDetailHighlightSnippets(snippets);

    setDetailOpen(true);
  };

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <PageHeader
        eyebrow="Grounded editorial drafting"
        title="EchoWrite"
        description="Generate long-form editorial content with source retrieval, citations, and evidence highlights."
        metrics={[
          {
            label: 'Retrieval grounded writing',
            detail: `References up to ${maxSources} source articles.`,
            icon: PenSquare,
          },
        ]}
      />

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-4">
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
          <Button variant="outline" onClick={generate} disabled={loading || !prompt.trim() || !content.trim()}>
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
        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
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
- separates generic task words from subject terms in your prompt
- scores title/body matches with stronger weight for subject terms
- filters out weak candidates that do not match enough subject terms
- sorts by score
- takes the strongest matches as “retrieved” candidates

This keeps broad articles from being used just because they share words like “impact,” “financial,” or “script.”

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
- compare each generated sentence to source passages
- cite/highlight only stronger passage matches
- show both cited sources and retrieved-but-not-cited context in the right panel`}
          </pre>
        </DialogContent>
      </Dialog>

      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Last generation prompt</DialogTitle>
            <DialogDescription>
              {lastModel ? `Model: ${lastModel}` : 'This is the full prompt used to generate the most recent EchoWrite output.'}
            </DialogDescription>
          </DialogHeader>
          <pre className="text-xs whitespace-pre-wrap break-words max-h-[65vh] overflow-auto rounded border bg-muted/20 p-3">
            {lastPrompt || 'No prompt captured yet. Generate content first.'}
          </pre>
        </DialogContent>
      </Dialog>

      {groundingStatus.hasOutput ? (
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-sm md:grid-cols-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <PenSquare className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">{groundingStatus.totalSentences} output sentences</p>
              <p className="text-xs text-muted-foreground">Generated draft structure</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">{groundingStatus.citedSentences} cited sentences</p>
              <p className="text-xs text-muted-foreground">{groundingStatus.percent}% passed citation threshold</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <Settings2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">{sources.length} retrieved sources</p>
              <p className="text-xs text-muted-foreground">
                {groundingStatus.hasRetrievedSources ? `${citedSourceCount} cited in output` : 'No matching source context found'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 overflow-hidden rounded-[1.5rem] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70">
          <div className="group relative min-h-[235px] overflow-hidden bg-slate-950">
            {outputHeroSource?.imageUrl ? (
              <div
                className="absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
                style={{ backgroundImage: `url("${outputHeroSource.imageUrl.replace(/"/g, '\\"')}")` }}
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(147,197,253,0.34),transparent_30%),linear-gradient(135deg,#071326,#18305d_56%,#0f172a)]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.9),rgba(15,23,42,0.6)_44%,rgba(15,23,42,0.22)),linear-gradient(0deg,rgba(2,6,23,0.76),transparent_46%)]" />
            <div className="absolute inset-x-0 -bottom-4 h-36 bg-gradient-to-t from-white from-[10%] via-white/88 via-[42%] to-transparent" />

            <div className="absolute right-5 top-5 z-20 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={copyOutput}
                disabled={!content.trim()}
                className="h-10 rounded-full border-white/20 bg-white/10 px-4 text-white shadow-lg shadow-black/20 backdrop-blur-md hover:bg-white/20 hover:text-white"
              >
                Copy
              </Button>
              <Button
                size="sm"
                onClick={saveDraft}
                disabled={!content.trim() || saving}
                className="h-10 rounded-full bg-white px-4 font-semibold text-slate-950 shadow-lg shadow-black/15 hover:bg-white/90"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
            </div>

            <div className="relative z-10 flex min-h-[235px] flex-col justify-end p-6 text-white sm:p-8">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-100 shadow-lg shadow-cyan-950/20 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Generated Output
              </div>
              <h2 className="max-w-[780px] text-balance font-serif text-3xl font-semibold leading-[1.08] tracking-normal text-white drop-shadow-2xl sm:text-[2.15rem]">
                {content.trim() ? outputTitle : 'Your EchoWrite draft will appear here'}
              </h2>
              {content.trim() && outputSubtitle ? (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78">{outputSubtitle}</p>
              ) : null}
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-white/82">
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {contentType === 'video-script' ? 'Video script' : 'Editorial article'}
                </span>
                {outputHeroSource ? <span className="max-w-[320px] truncate">Grounded by {outputHeroSource.title}</span> : null}
                {loading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Drafting...
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
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
        </div>

        <div className="lg:col-span-2 w-full rounded-lg border border-border bg-card p-0 overflow-hidden shadow-sm">
          <div className="shrink-0 p-4 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm">Sources ({citedSourceCount} cited / {sources.length} retrieved)</span>
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
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant={n ? 'default' : 'outline'} className="h-5 rounded text-[10px]">
                          {n ? 'Cited' : 'Retrieved'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {s.designation || 'n/a'}
                        </span>
                        {typeof s.score === 'number' ? (
                          <span className="text-[10px] text-muted-foreground">
                            score {s.score}
                          </span>
                        ) : null}
                      </div>

                      {(s.matchedTopicalTerms?.length || s.matchedTerms?.length) ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(s.matchedTopicalTerms?.length ? s.matchedTopicalTerms : s.matchedTerms || []).slice(0, 5).map((term) => (
                            <span key={term} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                              {term}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {showMatches && n ? (
                        <p className={`text-xs mt-2 italic line-clamp-3 ${colors ? `${colors.bg} ${colors.darkBg} rounded px-2 py-1 text-foreground` : 'text-muted-foreground'}`}>
                          “{sourceSnippetMap.get(s.id) || 'n/a'}”
                        </p>
                      ) : showMatches ? (
                        <p className="text-xs mt-2 rounded bg-muted/40 px-2 py-1 text-muted-foreground">
                          Retrieved for context, but not strongly matched to a generated sentence.
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
                            <ExternalLink className="ml-1.5 h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                {loading ? 'Retrieving matching source content...' : 'No sources retrieved yet.'}
              </div>
            )}
          </div>

          <div className="p-3 text-xs text-muted-foreground border-t bg-muted/10">
            Cited sources met a stronger passage-match threshold. Retrieved sources were provided to the model as context.
          </div>
        </div>
      </div>
      <ContentDetail
        content={detailContent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        highlightSnippets={detailHighlightSnippets}
      />
    </div>
  );
}
