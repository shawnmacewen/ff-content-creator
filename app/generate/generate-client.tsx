'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { ContentDetail } from '@/components/source-content/content-detail';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ContentTypeSelector } from '@/components/generator/content-type-selector';
import { SourceArticlePicker } from '@/components/generator/source-article-picker';
import { ToneControls } from '@/components/generator/tone-controls';
import { GenerationPreview } from '@/components/generator/generation-preview';
import { GenerationModeToggle, type GenerationMode } from '@/components/generator/generation-mode-toggle';
import { KitFormatSelector } from '@/components/generator/kit-format-selector';
import { KitGeneratedOutput } from '@/components/generator/kit-generated-output';
import { KitContentTypeSelector } from '@/components/generator/kit-content-type-selector';
import { Badge } from '@/components/ui/badge';
import { generateId } from '@/lib/storage/local-storage';
import type { ContentType, ToneType, ContentStatus, GeneratedContent } from '@/lib/types/content';
import { CONTENT_TYPE_MAP } from '@/lib/content-config';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import InstagramCarousel2Client, { type InstagramCarousel2ClientHandle } from '@/app/instagram-carousel-2/instagram-carousel-2-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollText } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function decodeEntitiesLite(input: string): string {
  const s = String(input || '');
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);

  const selectedSourceId = selectedSourceIds[0] ?? null;
  const { data: selectedSource } = useSWR<any>(
    selectedSourceId ? `/api/source-content/${selectedSourceId}` : null,
    fetcher
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const detailContent = selectedSource?.data ?? selectedSource ?? null;

  const normalizedBodyPreview = (() => {
    const raw = String(detailContent?.body || '');
    // Best-effort XML-ish normalization (mirrors ContentDetail behavior, but safe for this page).
    const decoded = decodeEntitiesLite(raw);

    const text = decoded
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<paragraph[^>]*>([\s\S]*?)<\/paragraph>/gi, '$1\n\n')
      .replace(/<container_text[^>]*>([\s\S]*?)<\/container_text>/gi, '\n\n$1\n')
      .replace(/<document_title[^>]*>([\s\S]*?)<\/document_title>/gi, '\n\n$1\n')
      .replace(/<short_title[^>]*>([\s\S]*?)<\/short_title>/gi, '\n\n$1\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, '')
      .replace(/\t/g, ' ')
      // collapse runs of spaces
      .replace(/[ ]{2,}/g, ' ')
      // trim spaces around newlines and collapse blank lines
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!text) return '';
    return text;
  })();
  const [mode, setMode] = useState<GenerationMode>('kit');

  const [kitOutputTab, setKitOutputTab] = useState<'carousel' | 'kit'>('kit');

  // SINGLE state
  const [selectedContentTypes, setSelectedContentTypes] = useState<ContentType[]>(['social-instagram']);
  const [tone, setTone] = useState<ToneType>('professional');
  const [customPrompt, setCustomPrompt] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [compliance, setCompliance] = useState<any>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [imageStatus, setImageStatus] = useState<string | null>(null);
  // Instagram image toggles
  // Defaults for KIT Instagram multipost workflow:
  // - images enabled
  // - carousel mode
  // - 3 slides
  // - sequential generation (for now)
  const [includeInstagramImage, setIncludeInstagramImage] = useState(true);
  const [instagramImageMode, setInstagramImageMode] = useState<'single' | 'carousel'>('carousel');

  // New: separate toggles for single vs carousel chips (KIT UX)
  const [instagramKitVariant, setInstagramKitVariant] = useState<'single' | 'carousel' | null>('carousel');
  const [includeInstagramSingleImages, setIncludeInstagramSingleImages] = useState(false);
  const [includeInstagramCarouselImages, setIncludeInstagramCarouselImages] = useState(true);

  // KIT state
  // Default kit: Campaign (Instagram only) first.
  const [kitTypes, setKitTypes] = useState<ContentType[]>(['social-instagram']);
  const [kitOutputs, setKitOutputs] = useState<Array<{ type: ContentType; label?: string; content: string }> | null>(null);
  const [isGeneratingKit, setIsGeneratingKit] = useState(false);
  const [pendingKitCarouselGenerate, setPendingKitCarouselGenerate] = useState(false);
  const [isGeneratingKitCarouselImages, setIsGeneratingKitCarouselImages] = useState(false);

  // Carousel 2.0 settings (KIT multipost)
  const [kitCarouselSlideCount, setKitCarouselSlideCount] = useState<number>(3);
  const [kitCarouselModel, setKitCarouselModel] = useState<'gpt-image-2' | 'gpt-image-1'>('gpt-image-2');
  const [kitCarouselCohesionMethod, setKitCarouselCohesionMethod] = useState<'prompt' | 'image-ref'>('image-ref');
  const [kitCarouselImageRefMode, setKitCarouselImageRefMode] = useState<'previous' | 'first'>('previous');
  const [kitCarouselMoreSeamlessBackground, setKitCarouselMoreSeamlessBackground] = useState<boolean>(true);
  const [kitCarouselAdvanced, setKitCarouselAdvanced] = useState<boolean>(false);
  const [kitCarouselPrompt, setKitCarouselPrompt] = useState<string>('.');

  const kitCarousel2Ref = useRef<InstagramCarousel2ClientHandle | null>(null);
  const singleCarousel2Ref = useRef<InstagramCarousel2ClientHandle | null>(null);

  // Parse URL params
  useEffect(() => {
    const typeParam = searchParams.get('type');
    const sourceIdsParam = searchParams.get('sourceIds');

    if (typeParam && typeParam.includes('-')) {
      setSelectedContentTypes([typeParam as ContentType]);
    } else if (typeParam === 'social') {
      setSelectedContentTypes(['social-twitter']);
    } else if (typeParam === 'email') {
      setSelectedContentTypes(['email-marketing']);
    } else if (typeParam === 'article') {
      setSelectedContentTypes(['article']);
    }

    if (sourceIdsParam) {
      const ids = sourceIdsParam.split(',').filter(Boolean);
      // Generate page image generation expects a single selected source.
      setSelectedSourceIds(ids.length ? [ids[0] as string] : []);
    }
  }, [searchParams]);

  useEffect(() => {
    // If a KIT run requested carousel generation but the Carousel 2.0 component
    // wasn't mounted yet, trigger it once it becomes available.
    if (!pendingKitCarouselGenerate) return;

    const shouldRun = kitTypes.includes('social-instagram') &&
      instagramKitVariant === 'carousel' &&
      includeInstagramCarouselImages;

    if (!shouldRun) {
      setPendingKitCarouselGenerate(false);
      return;
    }

    const handle = kitCarousel2Ref.current;
    if (!handle) return;

    (async () => {
      try {
        await handle.generate();
      } finally {
        setPendingKitCarouselGenerate(false);
      }
    })();
  }, [pendingKitCarouselGenerate, kitTypes, instagramKitVariant, includeInstagramCarouselImages]);

  const toggleKitType = (t: ContentType) => {
    setKitTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const handleToggleTypeSingle = (t: ContentType) => {
    // single asset → choose exactly one
    setSelectedContentTypes([t]);
  };


  useEffect(() => {
    // Keep Instagram Carousel tab first and default-active when selected.
    if (kitTypes.includes('social-instagram') && instagramKitVariant === 'carousel' && includeInstagramCarouselImages) {
      setKitOutputTab('carousel');
    } else {
      setKitOutputTab('kit');
    }
  }, [kitTypes, instagramKitVariant, includeInstagramCarouselImages]);

  const handleGenerateKit = useCallback(async () => {
    if (!kitTypes.length) {
      toast.error('Select at least one content type for the kit');
      return;
    }

    setIsGeneratingKit(true);
    setKitOutputs(null);

    const shouldGenerateCarousel = kitTypes.includes('social-instagram') &&
      instagramKitVariant === 'carousel' &&
      includeInstagramCarouselImages;

    // Start carousel generation in parallel (if possible).
    let carouselPromise: Promise<void> | null = null;
    if (shouldGenerateCarousel) {
      if (kitCarousel2Ref.current) {
        carouselPromise = kitCarousel2Ref.current.generate();
      } else {
        setPendingKitCarouselGenerate(true);
      }
    }

    try {
      const kitPromise = fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // type is ignored for kit mode but we send a stable value
          type: kitTypes[0],
          mode: 'kit',
          selectedTypes: kitTypes,
          includeInstagramImage,
          sourceContentIds: selectedSourceIds,
          customPrompt,
          tone,
          additionalContext,
        }),
      }).then(async (response) => {
        if (!response.ok) throw new Error('KIT generation failed');
        const payload = await response.json().catch(() => ({}));
        const outputs = Array.isArray(payload?.outputs) ? payload.outputs : null;
        setKitOutputs(outputs);
      });

      await Promise.allSettled([kitPromise, carouselPromise].filter(Boolean) as Promise<any>[]);

      toast.success('KIT generated');
    } catch (err) {
      console.error('KIT generation error:', err);
      toast.error('Failed to generate kit');
    } finally {
      setIsGeneratingKit(false);
    }
  }, [kitTypes, includeInstagramImage, instagramKitVariant, includeInstagramCarouselImages, kitCarousel2Ref, selectedSourceIds, customPrompt, tone, additionalContext]);

  const handleGenerate = useCallback(async () => {
    const primaryType = selectedContentTypes[0];
    if (!primaryType) {
      toast.error('Please select a content type');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    setCompliance(null);
    setGeneratedImages({});
    setImageStatus(includeInstagramImage ? 'Generating Instagram image...' : null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: primaryType,
          mode: 'single',
          includeInstagramImage,
          instagramImageMode,
          sourceContentIds: selectedSourceIds,
          customPrompt,
          tone,
          additionalContext,
        }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const contentTypeHeader = response.headers.get('content-type') || '';
      if (contentTypeHeader.includes('application/json')) {
        const payload = await response.json();
        setGeneratedContent(payload?.content || '');
        setCompliance(payload?.compliance || null);
        setGeneratedImages(payload?.images || {});
        if (includeInstagramImage) {
          const txt = String(payload?.content || '');
          if (/Image URL:/i.test(txt)) setImageStatus('Instagram image generated');
          else if (/Image generation status: failed/i.test(txt)) setImageStatus('Instagram image failed — see output section');
          else setImageStatus('Instagram image status unknown');
        }
      } else {
        setGeneratedContent(await response.text());
      }

      toast.success('Content generated');
    } catch (err) {
      console.error('Generation error:', err);
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedContentTypes, includeInstagramImage, selectedSourceIds, customPrompt, tone, additionalContext]);

  const handleSave = async (status: ContentStatus) => {
    const primaryType = selectedContentTypes[0];
    if (!primaryType || !generatedContent) return;

    const content: GeneratedContent = {
      id: generateId(),
      type: primaryType,
      title: generatedContent.split('\n')[0].slice(0, 100) || 'Untitled',
      content: generatedContent,
      sourceContentIds: selectedSourceIds,
      prompt: customPrompt,
      tone,
      status,
      versions: [
        {
          id: generateId(),
          content: generatedContent,
          createdAt: new Date().toISOString(),
          note: 'Initial generation',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/generated-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: content.type,
          title: content.title,
          content: content.content,
          sourceContentIds: content.sourceContentIds,
          prompt: content.prompt,
          tone: content.tone,
          status: content.status,
          versionNote: 'Initial generation',
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to save content');
      }

      toast.success(`Saved as ${status}`);
      router.push('/library');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Generate Campaign Content</h1>
            <p className="text-muted-foreground">Turn one source article into a coordinated content kit across channels.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* actions moved below Section 3 */}
        </div>
      </div>

      <GenerationModeToggle mode={mode} onChange={setMode} />

      {mode === 'kit' ? (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-lg font-semibold">1. Select KIT Content Types</h2>
              <KitContentTypeSelector
                selected={kitTypes}
                onToggle={(t) => {
                  // Base selection (multi-select)
                  toggleKitType(t);
                }}
                instagramVariant={instagramKitVariant}
                setInstagramVariant={(v) => setInstagramKitVariant(v)}
                includeInstagramSingleImages={includeInstagramSingleImages}
                includeInstagramCarouselImages={includeInstagramCarouselImages}
                onToggleInstagramSingleImages={() => {
                  // selecting single deselects carousel
                  setInstagramKitVariant('single');
                  setIncludeInstagramCarouselImages(false);

                  // ensure instagram is in kit types
                  setKitTypes((prev) => (prev.includes('social-instagram') ? prev : [...prev, 'social-instagram']));

                  setInstagramImageMode('single');
                  setIncludeInstagramImage(true);
                  setIncludeInstagramSingleImages((v) => !v);
                }}
                onToggleInstagramCarouselImages={() => {
                  // selecting carousel deselects single
                  setInstagramKitVariant('carousel');
                  setIncludeInstagramSingleImages(false);

                  // ensure instagram is in kit types
                  setKitTypes((prev) => (prev.includes('social-instagram') ? prev : [...prev, 'social-instagram']));

                  setInstagramImageMode('carousel');
                  setIncludeInstagramImage(true);
                  setIncludeInstagramCarouselImages((v) => !v);
                }}
              />
            
              {kitTypes.includes('social-instagram') && instagramKitVariant === 'carousel' && includeInstagramCarouselImages ? (
                <Card className="mt-6 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Instagram Carousel</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="text-sm">
                        <div className="text-xs text-muted-foreground mb-1">Slides</div>
                        <select
                          className="w-full rounded-xl border bg-background px-3 py-2"
                          value={kitCarouselSlideCount}
                          onChange={(e) => setKitCarouselSlideCount(Number(e.target.value) || 3)}
                        >
                          <option value={3}>3</option>
                          <option value={6}>6</option>
                          <option value={9}>9</option>
                        </select>
                      </label>

                      <label className="text-sm">
                        <div className="text-xs text-muted-foreground mb-1">Model</div>
                        <select
                          className="w-full rounded-xl border bg-background px-3 py-2"
                          value={kitCarouselModel}
                          onChange={(e) => setKitCarouselModel(e.target.value as any)}
                        >
                          <option value="gpt-image-2">gpt-image-2</option>
                          <option value="gpt-image-1">gpt-image-1</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="text-sm">
                        <div className="text-xs text-muted-foreground mb-1">Cohesion</div>
                        <select
                          className="w-full rounded-xl border bg-background px-3 py-2"
                          value={kitCarouselCohesionMethod}
                          onChange={(e) => setKitCarouselCohesionMethod(e.target.value as any)}
                        >
                          <option value="prompt">Prompt Based</option>
                          <option value="image-ref">Image Reference</option>
                        </select>
                      </label>

                      <label className="text-sm">
                        <div className="text-xs text-muted-foreground mb-1">Image Ref Mode</div>
                        <select
                          className="w-full rounded-xl border bg-background px-3 py-2"
                          value={kitCarouselImageRefMode}
                          onChange={(e) => setKitCarouselImageRefMode(e.target.value as any)}
                          disabled={kitCarouselCohesionMethod !== 'image-ref'}
                        >
                          <option value="previous">Previous</option>
                          <option value="first">First</option>
                        </select>
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={kitCarouselMoreSeamlessBackground}
                          onChange={(e) => setKitCarouselMoreSeamlessBackground(e.target.checked)}
                        />
                        More Seamless background
                      </label>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={kitCarouselAdvanced ? 'default' : 'outline'}
                          className="rounded-2xl"
                          onClick={() => setKitCarouselAdvanced((v) => !v)}
                        >
                          Advanced
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-2xl"
                          onClick={() => kitCarousel2Ref.current?.openPromptLog()}
                          title="View generation prompt log"
                        >
                          <ScrollText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {kitCarouselAdvanced ? (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">Carousel prompt (optional add-on)</div>
                        <textarea
                          className="w-full min-h-[84px] rounded-xl border bg-background px-3 py-2 text-sm"
                          value={kitCarouselPrompt}
                          onChange={(e) => setKitCarouselPrompt(e.target.value)}
                        />
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold">2. Generation Settings</h2>
              <ToneControls
                tone={tone}
                onToneChange={setTone}
                customPrompt={customPrompt}
                onCustomPromptChange={setCustomPrompt}
                additionalContext={additionalContext}
                onAdditionalContextChange={setAdditionalContext}
              />

            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">3. Select Content</h2>
            <div className="grid gap-6 lg:grid-cols-2 items-stretch">
              <div>
                <SourceArticlePicker
                  selectedId={selectedSourceIds[0] ?? null}
                  onSelect={(id) => setSelectedSourceIds(id ? [id] : [])}
                />
              </div>

              <div className="rounded-2xl border bg-card p-4 min-w-0">
                {selectedSource ? (
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="h-64 w-[28rem] overflow-hidden rounded-xl bg-muted shrink-0">
                        {(() => {
                          let meta: any = selectedSource?.data?.metadata ?? selectedSource?.metadata;
                          if (typeof meta === 'string') {
                            try {
                              meta = JSON.parse(meta);
                            } catch {
                              meta = null;
                            }
                          }

                          const fromExtraPropertiesArray = (key: string): string | undefined => {
                            const arr = meta?.raw?.extra_properties;
                            if (!Array.isArray(arr)) return undefined;
                            const hit = arr.find((x: any) => String(x?.key || '') === key);
                            const v = hit?.stringValue ?? hit?.value ?? hit?.string_value;
                            return typeof v === 'string' ? v : undefined;
                          };

                          const extraMap: any = meta?.extraProperties || meta?.raw?.extraProperties || null;

                          const thumb =
                            // Prefer LinkedIn URL from CMS metadata
                            extraMap?.['SocialMediaPlatformImages.LinkedIn'] ||
                            meta?.['SocialMediaPlatformImages.LinkedIn'] ||
                            fromExtraPropertiesArray('SocialMediaPlatformImages.LinkedIn') ||
                            meta?.SocialMediaPlatformImages?.LinkedIn ||
                            meta?.SocialMediaPlatformImages?.linkedIn ||
                            meta?.SocialMediaPlatformImages?.linkedin ||
                            meta?.socialMediaPlatformImages?.LinkedIn ||
                            meta?.socialMediaPlatformImages?.linkedIn ||
                            meta?.socialMediaPlatformImages?.linkedin ||
                            // Fallbacks
                            extraMap?.['SocialMediaPlatformImages.Thumbnail'] ||
                            meta?.['SocialMediaPlatformImages.Thumbnail'] ||
                            fromExtraPropertiesArray('SocialMediaPlatformImages.Thumbnail') ||
                            meta?.SocialMediaPlatformImages?.Thumbnail ||
                            meta?.SocialMediaPlatformImages?.thumbnail ||
                            meta?.socialMediaPlatformImages?.Thumbnail ||
                            meta?.socialMediaPlatformImages?.thumbnail ||
                            selectedSource?.data?.imageUrl ||
                            selectedSource?.imageUrl;

                          if (!thumb) return null;
                          // eslint-disable-next-line @next/next/no-img-element
                          return (
                            <img
                              src={String(thumb).trim()}
                              alt=""
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          );
                        })()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">Selected Content</div>
                        <div className="text-sm font-medium truncate">
                          {decodeEntitiesLite(String(selectedSource?.data?.title ?? selectedSource?.title ?? 'Untitled'))}
                        </div>
<div className="mt-1 flex flex-wrap items-center gap-2">
                          {(() => {
                            let meta: any = selectedSource?.data?.metadata ?? selectedSource?.metadata;
                            if (typeof meta === 'string') {
                              try { meta = JSON.parse(meta); } catch { meta = null; }
                            }
                            const extra: any = meta?.extraProperties || meta?.raw?.extraProperties || {};
                            const designation = extra?.ContentDesignation || extra?.contentDesignation || extra?.Designation || extra?.designation || extra?.APContentType || null;
                            if (!designation) return null;
                            return (
                              <Badge variant="outline" className="rounded-full text-[11px]">
                                {String(designation)}
                              </Badge>
                            );
                          })()}
                          {(() => {
                            let meta: any = selectedSource?.data?.metadata ?? selectedSource?.metadata;
                            if (typeof meta === 'string') {
                              try { meta = JSON.parse(meta); } catch { meta = null; }
                            }
                            const extra: any = meta?.extraProperties || meta?.raw?.extraProperties || {};
                            const fn = extra?.BasContentFilename || extra?.basContentFilename || null;
                            if (!fn) return null;
                            return (
                              <span className="text-[11px] text-muted-foreground">{String(fn)}</span>
                            );
                          })()}
                        </div>
                        {(selectedSource?.data?.publishedAt || selectedSource?.publishedAt) ? (
                          <div className="text-[11px] text-muted-foreground">
                            {String(selectedSource?.data?.publishedAt ?? selectedSource?.publishedAt).split('T')[0]}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {(selectedSource?.data?.excerpt ?? selectedSource?.excerpt) ? (
                      <div className="text-xs text-muted-foreground line-clamp-3">
                        {String(selectedSource?.data?.excerpt ?? selectedSource?.excerpt)}
                      </div>
                    ) : null}

                    <div className="rounded-xl border bg-background/60 p-3 max-h-[320px] overflow-auto">
                      {(detailContent?.tags && Array.isArray(detailContent.tags) && detailContent.tags.length) ? (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {detailContent.tags.slice(0, 8).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="rounded-full text-[11px]">
                              {decodeEntitiesLite(String(tag))}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      <div className="text-[11px] font-semibold text-muted-foreground mb-2">Body preview</div>
                      <div className="text-xs whitespace-pre-wrap leading-relaxed">{normalizedBodyPreview}</div>
                    </div>

                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-2xl"
                        onClick={() => setDetailOpen(true)}
                        disabled={!selectedSourceId}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Select a source article to preview it here.</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button className="rounded-2xl" onClick={() => router.push('/library')} variant="outline">
              Saved Drafts
            </Button>
            <div className="flex items-center gap-2">
              <Button
                className="rounded-2xl bg-violet-600 hover:bg-violet-600/90"
                onClick={mode === 'single' ? handleGenerate : handleGenerateKit}
                disabled={mode === 'single' ? isGenerating : (isGeneratingKit || isGeneratingKitCarouselImages)}
              >
                Generate
              </Button>

              {(mode === 'single' ? isGenerating : (isGeneratingKit || isGeneratingKitCarouselImages)) ? (
                <div className="flex items-center gap-1" aria-label="Generating">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" />
                </div>
              ) : null}
            </div>
          </div>

<div>
            <h2 className="mb-3 text-lg font-semibold">4. Generated Output</h2>

            <div className="rounded-2xl border bg-card p-3 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {kitTypes.includes('social-instagram') && instagramKitVariant === 'carousel' && includeInstagramCarouselImages ? (
                  <button
                    type="button"
                    onClick={() => setKitOutputTab('carousel')}
                    className={cn(
                      'rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors',
                      kitOutputTab === 'carousel'
                        ? 'border-violet-500/60 bg-violet-500/10'
                        : 'bg-background/60 hover:bg-background'
                    )}
                  >
                    Instagram Carousel
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setKitOutputTab('kit')}
                  className={cn(
                    'rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors',
                    kitOutputTab === 'kit'
                      ? 'border-violet-500/60 bg-violet-500/10'
                      : 'bg-background/60 hover:bg-background'
                  )}
                >
                  Kit Content
                </button>
              </div>
            </div>

            {/* Keep both mounted; switching tabs must not clear */}
            <div className={cn('mt-3', kitOutputTab !== 'kit' && 'hidden')}>
              <KitGeneratedOutput
                selectedTypes={kitTypes}
                outputs={kitOutputs}
              />
            </div>

            <div className={cn('mt-3', kitOutputTab !== 'carousel' && 'hidden')}>
              {selectedSourceIds.length !== 1 ? (
                <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Select exactly 1 source article to generate carousel images.
                </div>
              ) : (
                <InstagramCarousel2Client
                  ref={kitCarousel2Ref}
                  selectedSourceId={selectedSourceIds[0] || null}
                  hideSourcePicker
                  hideSettingsControls
                  defaultTab="carousel"
                  generateLabel="Generate Images"
                  onLoadingChange={setIsGeneratingKitCarouselImages}
                  slideCount={kitCarouselSlideCount}
                  onSlideCountChange={setKitCarouselSlideCount}
                  model={kitCarouselModel}
                  onModelChange={setKitCarouselModel}
                  cohesionMethod={kitCarouselCohesionMethod}
                  onCohesionMethodChange={setKitCarouselCohesionMethod}
                  imageRefMode={kitCarouselImageRefMode}
                  onImageRefModeChange={setKitCarouselImageRefMode}
                  moreSeamlessBackground={kitCarouselMoreSeamlessBackground}
                  onMoreSeamlessBackgroundChange={setKitCarouselMoreSeamlessBackground}
                  showAdvancedPromptInput={kitCarouselAdvanced}
                  onShowAdvancedPromptInputChange={setKitCarouselAdvanced}
                  topic={kitCarouselPrompt}
                  onTopicChange={setKitCarouselPrompt}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 text-lg font-semibold">1. Select Content Type</h2>
                <ContentTypeSelector
                  selected={selectedContentTypes}
                  onToggle={handleToggleTypeSingle}
                  includeInstagramImage={includeInstagramImage}
                  onToggleInstagramImage={() => {
                    setIncludeInstagramImage((v) => !v);
                  }}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="mb-3 text-lg font-semibold">2. Generation Settings</h2>
                <ToneControls
                  tone={tone}
                  onToneChange={setTone}
                  customPrompt={customPrompt}
                  onCustomPromptChange={setCustomPrompt}
                  additionalContext={additionalContext}
                  onAdditionalContextChange={setAdditionalContext}
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">3. Select Content</h2>
            <div className="grid gap-6 lg:grid-cols-2 items-stretch">
              <div>
                <SourceArticlePicker
                  selectedId={selectedSourceIds[0] ?? null}
                  onSelect={(id) => setSelectedSourceIds(id ? [id] : [])}
                />
              </div>

              <div className="rounded-2xl border bg-card p-4 min-w-0">
                {selectedSource ? (
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="h-64 w-[28rem] overflow-hidden rounded-xl bg-muted shrink-0">
                        {(() => {
                          let meta: any = selectedSource?.data?.metadata ?? selectedSource?.metadata;
                          if (typeof meta === 'string') {
                            try {
                              meta = JSON.parse(meta);
                            } catch {
                              meta = null;
                            }
                          }

                          const thumb =
                            meta?.SocialMediaPlatformImages?.Thumbnail ||
                            meta?.SocialMediaPlatformImages?.thumbnail ||
                            meta?.socialMediaPlatformImages?.Thumbnail ||
                            meta?.socialMediaPlatformImages?.thumbnail ||
                            selectedSource?.data?.imageUrl ||
                            selectedSource?.imageUrl ||
                            // TEMP default thumbnail for testing
                            'https://www.broadridgeadvisor.com/images/SocialMediaImages/Twitter/100825CA_TW.jpg';

                          if (!thumb) return null;
                          // eslint-disable-next-line @next/next/no-img-element
                          return (
                            <img
                              src={String(thumb).trim()}
                              alt=""
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          );
                        })()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">Selected Content</div>
                        <div className="text-sm font-medium truncate">
                          {decodeEntitiesLite(String(selectedSource?.data?.title ?? selectedSource?.title ?? 'Untitled'))}
                        </div>
<div className="mt-1 flex flex-wrap items-center gap-2">
                          {(() => {
                            let meta: any = selectedSource?.data?.metadata ?? selectedSource?.metadata;
                            if (typeof meta === 'string') {
                              try { meta = JSON.parse(meta); } catch { meta = null; }
                            }
                            const extra: any = meta?.extraProperties || meta?.raw?.extraProperties || {};
                            const designation = extra?.ContentDesignation || extra?.contentDesignation || extra?.Designation || extra?.designation || extra?.APContentType || null;
                            if (!designation) return null;
                            return (
                              <Badge variant="outline" className="rounded-full text-[11px]">
                                {String(designation)}
                              </Badge>
                            );
                          })()}
                          {(() => {
                            let meta: any = selectedSource?.data?.metadata ?? selectedSource?.metadata;
                            if (typeof meta === 'string') {
                              try { meta = JSON.parse(meta); } catch { meta = null; }
                            }
                            const extra: any = meta?.extraProperties || meta?.raw?.extraProperties || {};
                            const fn = extra?.BasContentFilename || extra?.basContentFilename || null;
                            if (!fn) return null;
                            return (
                              <span className="text-[11px] text-muted-foreground">{String(fn)}</span>
                            );
                          })()}
                        </div>
                        {(selectedSource?.data?.publishedAt || selectedSource?.publishedAt) ? (
                          <div className="text-[11px] text-muted-foreground">
                            {String(selectedSource?.data?.publishedAt ?? selectedSource?.publishedAt).split('T')[0]}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {(selectedSource?.data?.excerpt ?? selectedSource?.excerpt) ? (
                      <div className="text-xs text-muted-foreground line-clamp-3">
                        {String(selectedSource?.data?.excerpt ?? selectedSource?.excerpt)}
                      </div>
                    ) : null}

                    <div className="rounded-xl border bg-background/60 p-3 max-h-[320px] overflow-auto">
                      {(detailContent?.tags && Array.isArray(detailContent.tags) && detailContent.tags.length) ? (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {detailContent.tags.slice(0, 8).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="rounded-full text-[11px]">
                              {decodeEntitiesLite(String(tag))}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      <div className="text-[11px] font-semibold text-muted-foreground mb-2">Body preview</div>
                      <div className="text-xs whitespace-pre-wrap leading-relaxed">{normalizedBodyPreview}</div>
                    </div>

                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-2xl"
                        onClick={() => setDetailOpen(true)}
                        disabled={!selectedSourceId}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Select a source article to preview it here.</div>
                )}
              </div>
            </div>
          </div>


          {selectedContentTypes[0] === 'social-instagram' && includeInstagramImage && instagramImageMode === 'carousel' ? (
            <div>
              <h2 className="mb-3 text-lg font-semibold">4. Instagram Carousel Images</h2>
              {selectedSourceIds.length !== 1 ? (
                <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Select exactly 1 source article to generate carousel images.
                </div>
              ) : (
                <InstagramCarousel2Client
                  ref={singleCarousel2Ref}
                  selectedSourceId={selectedSourceIds[0] || null}
                  hideSourcePicker
                  defaultTab="carousel"
                  generateLabel="Generate Images"
                />
              )}
            </div>
          ) : null}


          <div>
            <h2 className="mb-3 text-lg font-semibold">5. Preview & Save</h2>
            <GenerationPreview
              contentType={selectedContentTypes[0] ?? null}
              previewLabel={selectedContentTypes[0] ? CONTENT_TYPE_MAP[selectedContentTypes[0]].label : null}
              content={generatedContent}
              isGenerating={isGenerating}
              onContentChange={setGeneratedContent}
              onRegenerate={handleGenerate}
              onSave={handleSave}
              compliance={compliance}
              imageGenerationEnabled={selectedContentTypes[0] === 'social-instagram' ? includeInstagramImage : false}
              generatedImages={generatedImages}
              imageStatus={imageStatus}
            />
          </div>
        </div>
      )}

      <ContentDetail
        content={detailContent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
