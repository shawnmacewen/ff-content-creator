'use client';

import './echowrite.css';

import { useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Copy, ExternalLink, FileText, Info, Link2, Loader2, Save, Settings2, Sparkles } from 'lucide-react';
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

type EchoWriteTemplate = 'aurora-ribbon' | 'desert-modern';

const ECHOWRITE_TEMPLATE: EchoWriteTemplate = 'aurora-ribbon';

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o mini - fast/current default' },
  { value: 'gpt-4.1', label: 'GPT-4.1 - stronger non-reasoning' },
  { value: 'gpt-5.2', label: 'GPT-5.2 - strong comparison model' },
  { value: 'gpt-5.5', label: 'GPT-5.5 - latest/strongest' },
];

function titleFromContent(content: string) {
  const firstLine = content
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  return (firstLine || 'EchoWrite draft').replace(/^#+\s*/, '').slice(0, 100);
}

function toneFromWritingStyle(style: 'professional' | 'fun' | 'educational') {
  if (style === 'fun') return 'friendly';
  if (style === 'educational') return 'authoritative';
  return 'professional';
}

function AuroraRibbonDecoration() {
  return (
    <svg
      className="ew-accent-decoration ew-aurora-decoration"
      viewBox="0 0 1600 120"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ew-aurora-ribbon" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c96c63" stopOpacity="0" />
          <stop offset="28%" stopColor="#c96c63" stopOpacity="0.38" />
          <stop offset="60%" stopColor="#e3a766" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#e3a766" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="ew-aurora-line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c96c63" stopOpacity="0" />
          <stop offset="30%" stopColor="#d77c6a" stopOpacity="0.65" />
          <stop offset="72%" stopColor="#e3a766" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#e3a766" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        className="ew-aurora-ribbon"
        d="M -120 118 C 180 42, 430 56, 680 91 C 930 126, 1120 118, 1360 72 C 1490 47, 1580 39, 1700 49 L 1700 91 C 1500 81, 1350 94, 1140 119 C 880 150, 660 119, 430 94 C 220 72, 40 81, -120 132 Z"
      />
      <path
        className="ew-aurora-line ew-aurora-line--one"
        d="M -80 108 C 250 42, 500 53, 760 88 C 1020 122, 1240 108, 1690 49"
      />
      <path
        className="ew-aurora-line ew-aurora-line--two"
        d="M 250 116 C 530 68, 755 74, 970 101 C 1190 129, 1400 92, 1650 67"
      />
    </svg>
  );
}

function DesertModernDecoration() {
  return (
    <svg
      className="ew-accent-decoration ew-desert-decoration"
      viewBox="0 0 1600 120"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ew-desert-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#eee0c5" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#f1bd73" stopOpacity="0.82" />
        </linearGradient>
      </defs>
      <path className="ew-desert-arch ew-desert-arch--outer" d="M 1040 126 A 235 195 0 0 1 1510 126" />
      <path className="ew-desert-arch ew-desert-arch--inner" d="M 1120 126 A 155 128 0 0 1 1430 126" />
      <path className="ew-desert-horizon" d="M 0 117 L 1600 117" />
    </svg>
  );
}

function EchoWriteDecoration({ template }: { template: EchoWriteTemplate }) {
  if (template === 'desert-modern') {
    return <DesertModernDecoration />;
  }

  return <AuroraRibbonDecoration />;
}

function EchoWriteAccentHeader({
  placement,
  template,
  children,
}: {
  placement: 'page' | 'draft';
  template: EchoWriteTemplate;
  children: ReactNode;
}) {
  return (
    <header className={`ew-accent-header ew-accent-header--${placement}`}>
      <EchoWriteDecoration template={template} />
      <div className="ew-accent-header__content">{children}</div>
    </header>
  );
}

export default function EchoWritePage() {
  const [prompt, setPrompt] = useState('');
  const [writingStyle, setWritingStyle] = useState<'professional' | 'fun' | 'educational'>('professional');
  const [contentType, setContentType] = useState<'article' | 'video-script'>('article');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [targetWordCount, setTargetWordCount] = useState('');
  const [maxSources, setMaxSources] = useState(6);
  const [model, setModel] = useState('gpt-4o-mini');

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
  const [advancedOpen, setAdvancedOpen] = useState(false);

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

  const outputTitle = useMemo(() => titleFromContent(content), [content]);

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
  const hasGeneratedOutput = Boolean(content.trim() || sources.length);

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
          model,
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
    <main className="echowrite-page" data-echowrite-template={ECHOWRITE_TEMPLATE}>
      <EchoWriteAccentHeader placement="page" template={ECHOWRITE_TEMPLATE}>
        <div>
          <h1>EchoWrite</h1>
          <p>Create accurate, source-backed content.</p>
        </div>
      </EchoWriteAccentHeader>

        <section className="echowrite-composer">
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">What would you like to create?</h2>
          <Textarea
            placeholder="Describe your topic, audience, key message, and anything the draft should include..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            className="echowrite-composer__prompt"
          />
          <div className="echowrite-composer__settings">
            <div className="contents">
              <div>
                <div className="mb-1.5 text-xs font-medium text-slate-600">Writing style</div>
                <Select value={writingStyle} onValueChange={(v: any) => setWritingStyle(v)}>
                  <SelectTrigger className="h-11 w-full border-slate-200 bg-white shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="fun">Fun</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-1.5 text-xs font-medium text-slate-600">Content type</div>
                <Select value={contentType} onValueChange={(v: any) => setContentType(v)}>
                  <SelectTrigger className="h-11 w-full border-slate-200 bg-white shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="video-script">Video Script</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-1.5 text-xs font-medium text-slate-600">Length</div>
                <Select value={length} onValueChange={(v: any) => setLength(v)}>
                  <SelectTrigger className="h-11 w-full border-slate-200 bg-white shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-1.5 text-xs font-medium text-slate-600">Target words</div>
                <Input
                  value={targetWordCount}
                  onChange={(e) => setTargetWordCount(e.target.value)}
                  placeholder="Optional"
                  className="h-11 border-slate-200 bg-white shadow-sm placeholder:text-slate-500"
                />
              </div>
              <div>
                <div className="mb-1.5 text-xs font-medium text-slate-600">References</div>
                <Select value={String(maxSources)} onValueChange={(value) => setMaxSources(Number(value))}>
                  <SelectTrigger className="h-11 w-full border-slate-200 bg-white shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 3, 6, 10, 12].map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count === 0 ? 'None' : `Up to ${count}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="echowrite-composer__actions">
              <div className="hidden h-12 w-px bg-slate-200 xl:block" />
              <Button variant="outline" className="h-11 gap-2 border-slate-200 bg-white px-5 text-slate-800 shadow-sm" onClick={() => setAdvancedOpen(true)}>
                <Settings2 className="h-4 w-4" />
                Advanced settings
              </Button>
              <span className="hidden h-11 w-[154px] lg:block" aria-hidden="true" />
              <span className="hidden h-11 w-[132px] lg:block" aria-hidden="true" />
              <Button onClick={generate} disabled={loading || !prompt.trim()} className="primary-action h-11 gap-2 px-5 font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'Generating...' : hasGeneratedOutput ? 'Regenerate draft' : 'Generate draft'}
              </Button>
            </div>
          </div>
          {error ? (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </section>

      <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <DialogContent className="max-w-xl w-[92vw]">
          <DialogHeader>
            <DialogTitle>Advanced settings</DialogTitle>
            <DialogDescription>
              Tune the model and inspect retrieval behavior for EchoWrite generation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">OpenAI model</div>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" className="justify-start gap-2" onClick={() => setHowItWorksOpen(true)}>
                <Info className="h-4 w-4" />
                How EchoWrite works
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => setPromptOpen(true)}>
                <Settings2 className="h-4 w-4" />
                View last prompt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

        <section className="echowrite-workspace">
          <article className="echowrite-draft-card">
            <EchoWriteAccentHeader placement="draft" template={ECHOWRITE_TEMPLATE}>
              <div className="generated-draft-header">
              <div className="generated-draft-badge">
                <Sparkles className="generated-draft-sparkle h-4 w-4" />
                Generated draft
              </div>
              <div className="generated-draft-actions">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyOutput}
                  disabled={!content.trim()}
                  className="generated-draft-action gap-2 hover:bg-white"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={saveDraft}
                  disabled={!content.trim() || saving}
                  className="generated-draft-action gap-2 hover:bg-white"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Saving...' : 'Save draft'}
                </Button>
              </div>
            </div>
            </EchoWriteAccentHeader>
            <div className="echowrite-draft-body">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0 text-blue-700" />
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-slate-950">
                      {content.trim() ? outputTitle : contentType === 'video-script' ? 'Video script' : 'Editorial article'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">Highlights connect claims to supporting sources.</p>
                  </div>
                </div>
                {groundingStatus.hasOutput ? (
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      {groundingStatus.citedSentences}/{groundingStatus.totalSentences} cited
                    </span>
                    <span className="rounded-md border border-slate-200 px-2.5 py-1">{sources.length} retrieved</span>
                  </div>
                ) : null}
              </div>
            {content.trim() ? (
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
            ) : (
              <div className="echowrite-draft-empty">
                <FileText className="h-14 w-14 text-slate-500" />
                <h3 className="mt-5 text-lg font-semibold text-slate-950">Ready for your first draft</h3>
                <p className="mt-3 max-w-sm text-center text-sm leading-6 text-slate-600">
                  Describe what you need above, then generate a source-backed draft.
                </p>
              </div>
            )}
          </div>
          </article>

          <aside className="echowrite-sources-card">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 p-5">
            <span className="text-lg font-semibold text-slate-950">Sources <span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-sm text-slate-700">{sources.length}</span></span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Show matches</span>
              <Switch checked={showMatches} onCheckedChange={(v) => setShowMatches(Boolean(v))} />
            </div>
          </div>


          <div className="max-h-[720px] flex-1 space-y-2.5 overflow-auto p-4">
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
                  className={`min-h-[140px] cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all ${colors?.border || 'border-l-slate-200'} border-l-4 ${isHovered ? `ring-2 ${colors?.ring || 'ring-blue-500'} ring-offset-1 ring-offset-white` : ''}`}
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
                      <h4 className="font-medium text-sm leading-tight text-slate-950">{s.title}</h4>
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
                            className="h-7 px-2 text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-800"
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
              <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
                <FileText className="h-12 w-12 text-slate-500" />
                <h3 className="mt-5 text-lg font-semibold text-slate-950">{loading ? 'Finding sources...' : 'No sources yet'}</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
                  {loading ? 'EchoWrite is retrieving matching source content.' : 'EchoWrite will retrieve relevant references when you generate.'}
                </p>
                <div className="sources-info-callout mt-16 flex w-full items-center justify-center gap-3 rounded-lg border p-4 text-center text-sm">
                  <Info className="h-4 w-4 shrink-0 text-slate-600" />
                  <span>Citations and retrieved references will appear here.</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600">
            <Link2 className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
            {citedSourceCount} cited source{citedSourceCount === 1 ? '' : 's'} met a stronger passage-match threshold. Retrieved sources were provided to the model as context.
          </div>
          </aside>
        </section>
      <ContentDetail
        content={detailContent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        highlightSnippets={detailHighlightSnippets}
      />
    </main>
  );
}
