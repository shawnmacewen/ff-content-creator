'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ContentTypeSelector } from '@/components/generator/content-type-selector';
import { SourceArticlePicker } from '@/components/generator/source-article-picker';
import { ToneControls } from '@/components/generator/tone-controls';
import { GenerationPreview } from '@/components/generator/generation-preview';
import { GenerationModeToggle, type GenerationMode } from '@/components/generator/generation-mode-toggle';
import { KitFormatSelector } from '@/components/generator/kit-format-selector';
import { KitGeneratedOutput } from '@/components/generator/kit-generated-output';
import { KitContentTypeSelector } from '@/components/generator/kit-content-type-selector';
import { generateId } from '@/lib/storage/local-storage';
import type { ContentType, ToneType, ContentStatus, GeneratedContent } from '@/lib/types/content';
import { CONTENT_TYPE_MAP } from '@/lib/content-config';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { InstagramCarouselPanel } from '@/components/generator/instagram-carousel-panel';
import { InstagramImageModal } from '@/components/generator/instagram-image-modal';

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [mode, setMode] = useState<GenerationMode>('single');

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
  const [includeInstagramImage, setIncludeInstagramImage] = useState(false);
  const [instagramImageModalOpen, setInstagramImageModalOpen] = useState(false);
  const [instagramImageMode, setInstagramImageMode] = useState<'single' | 'carousel'>('single');
  const [instagramCarouselGenerationMode, setInstagramCarouselGenerationMode] = useState<'sequential' | 'master-plate'>('master-plate');
  const [instagramCarouselStyle, setInstagramCarouselStyle] = useState<'purple-gold' | 'frost'>('purple-gold');
  const [instagramCarouselSlides, setInstagramCarouselSlides] = useState<number>(6);

  // New: separate toggles for single vs carousel chips (KIT UX)
  const [instagramKitVariant, setInstagramKitVariant] = useState<'single' | 'carousel' | null>('single');
  const [includeInstagramSingleImages, setIncludeInstagramSingleImages] = useState(false);
  const [includeInstagramCarouselImages, setIncludeInstagramCarouselImages] = useState(false);

  const [instagramCarouselSlidesData, setInstagramCarouselSlidesData] = useState<any[] | null>(null);
  const [instagramCarouselCaption, setInstagramCarouselCaption] = useState<string>('');
  const [isGeneratingCarouselImages, setIsGeneratingCarouselImages] = useState(false);
  const [carouselProgress, setCarouselProgress] = useState<{ total: number; done: number; activeSlide: number } | null>(null);
  const [instagramCarouselTheme, setInstagramCarouselTheme] = useState<any | null>(null);
  const [instagramCarouselMasterPlate, setInstagramCarouselMasterPlate] = useState<string | null>(null);
  const [instagramCarouselPromptLog, setInstagramCarouselPromptLog] = useState<string>('');
  const [instagramCarouselLastPrompt, setInstagramCarouselLastPrompt] = useState<string>('');

  // KIT state
  const [kitTypes, setKitTypes] = useState<ContentType[]>(['social-instagram', 'social-linkedin']);
  const [kitOutputs, setKitOutputs] = useState<Array<{ type: ContentType; label?: string; content: string }> | null>(null);
  const [isGeneratingKit, setIsGeneratingKit] = useState(false);

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

    if (sourceIdsParam) setSelectedSourceIds(sourceIdsParam.split(',').filter(Boolean));
  }, [searchParams]);

  const toggleKitType = (t: ContentType) => {
    setKitTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const handleToggleTypeSingle = (t: ContentType) => {
    // single asset → choose exactly one
    setSelectedContentTypes([t]);
  };

  const handleSampleInstagramCarousel = useCallback(() => {
    const slideCount = 6;

    // This sample generator mimics our API shapes:
    // - plan: { theme, slides[], caption, masterPlate|null }
    // - slide (master-plate): { imageUrl: masterPlate, cropX }
    // - slide (sequential): { imageUrl: <per-slide bg>, cropX: null }

    const theme = {
      title: 'Sample Editorial Theme',
      palette: 'Violet/indigo gradients with neutral charcoal',
      typography: 'Bold editorial headline + minimal supporting line',
      lighting: 'Soft cinematic',
      texture: 'Subtle grain',
      composition: 'Large hero area, bottom text-safe zone',
      imageryTheme: 'Abstract markets, charts, and travel/trade motifs',
    };

    const mkSvg = (label: string, accent: string, variant: number) => {
      // keep it cohesive across sequential samples by using the same base palette,
      // with slight accent shifts (variant).
      const accent2 = variant % 2 === 0 ? '#a855f7' : '#7c3aed';
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2a0f4d"/>
      <stop offset="0.55" stop-color="#0b1220"/>
      <stop offset="1" stop-color="#1f2a44"/>
    </linearGradient>
    <radialGradient id="r" cx="25%" cy="15%" r="70%">
      <stop offset="0" stop-color="${accent2}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="r2" cx="78%" cy="30%" r="60%">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.20"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1536" height="1024" fill="url(#g)"/>
  <rect width="1536" height="1024" fill="url(#r)"/>
  <rect width="1536" height="1024" fill="url(#r2)"/>
  <path d="M0,760 C240,690 420,720 640,680 C880,635 1040,520 1240,520 C1400,520 1480,560 1536,590 L1536,1024 L0,1024 Z" fill="#ffffff" fill-opacity="0.06"/>
  <path d="M0,820 C260,760 420,790 660,740 C940,680 1080,560 1260,560 C1400,560 1480,610 1536,640 L1536,1024 L0,1024 Z" fill="#ffffff" fill-opacity="0.04"/>
  <circle cx="1240" cy="210" r="260" fill="#ffffff" fill-opacity="0.03"/>
  <text x="80" y="120" font-family="Inter,system-ui" font-size="40" fill="#ffffff" fill-opacity="0.22">${label}</text>
</svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    };

    const slides = [
      { id: 'slide-1', headline: 'Locked out of\nHomeownership?', summary: 'Many young people find housing inaccessible due to high costs and limited supply.', motif: 'house', placement: 'right' },
      { id: 'slide-2', headline: 'Rates stayed\nhigher longer', summary: 'Borrowing costs rose fast — affordability moved with it.', motif: 'chart line', placement: 'right' },
      { id: 'slide-3', headline: 'Supply\nstill tight', summary: 'Inventory constraints keep prices sticky in many regions.', motif: 'building', placement: 'right' },
      { id: 'slide-4', headline: 'What it means\nfor buyers', summary: 'Budgeting, timelines, and expectations shift in this environment.', motif: 'calendar', placement: 'right' },
      { id: 'slide-5', headline: 'Watch these\nsignals next', summary: 'Inflation prints, jobs data, and guidance can move rate expectations.', motif: 'binoculars', placement: 'right' },
      { id: 'slide-6', headline: 'Next steps', summary: 'Save this, share with a friend, and follow for more market explainers.', motif: 'arrow', placement: 'bottom-right' },
    ];

    if (instagramCarouselGenerationMode === 'master-plate') {
      const masterPlate = mkSvg('SAMPLE MASTER PLATE', '#a855f7', 0);
      const outputs = slides.map((s, idx) => ({
        ...s,
        imageUrl: masterPlate,
        cropX: Math.round((idx / Math.max(1, slideCount - 1)) * 100),
        motifUrl: null,
      }));
      setInstagramCarouselTheme(theme);
      setInstagramCarouselMasterPlate(masterPlate);
      setInstagramCarouselSlidesData(outputs);
      setInstagramCarouselCaption('Here are 6 key takeaways — swipe through.\n\nSave this for later.\n\n#Markets #Investing');
      toast.success('Loaded sample carousel (Master Plate)');
      return;
    }

    // Sequential sample: per-slide backgrounds, but VERY cohesive (same system, slight variations)
    const outputs = slides.map((s, idx) => ({
      ...s,
      imageUrl: mkSvg(`SAMPLE BG ${idx + 1}`, '#c084fc', idx + 1),
      cropX: null,
      motifUrl: null,
    }));

    setInstagramCarouselTheme(theme);
    setInstagramCarouselMasterPlate(null);
    setInstagramCarouselSlidesData(outputs);
    setInstagramCarouselCaption('Here are 6 key takeaways — swipe through.\n\nSave this for later.\n\n#Markets #Investing');
    toast.success('Loaded sample carousel (Sequential)');
  }, [instagramCarouselGenerationMode]);

  const handleGenerateInstagramCarousel = useCallback(async () => {
    const instagramSelected = mode === 'single'
      ? selectedContentTypes[0] === 'social-instagram'
      : kitTypes.includes('social-instagram');

    if (!instagramSelected) {
      toast.error('Select Instagram in your content types first');
      return;
    }

    if (!selectedSourceIds.length) {
      toast.error('Select a source article first');
      return;
    }

    setIsGeneratingCarouselImages(true);
    setInstagramCarouselSlidesData(null);
    setInstagramCarouselCaption('');

    try {
      // 1) Get plan + shared theme once
      const planRes = await fetch('/api/generate/instagram-carousel/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceContentIds: selectedSourceIds,
          slideCount: instagramCarouselSlides,
          generationMode: instagramCarouselGenerationMode,
          style: instagramCarouselStyle,
        }),
      });
      const plan = await planRes.json().catch(() => ({}));
      if (!planRes.ok) throw new Error(plan?.error || `Carousel plan failed (${planRes.status})`);

      const slides = Array.isArray(plan?.slides) ? plan.slides : [];
      const caption = String(plan?.caption || '');
      const theme = plan?.theme;
      const masterPlate = plan?.masterPlate || null;
      setInstagramCarouselTheme(theme || null);
      setInstagramCarouselMasterPlate(masterPlate);

      // Initialize UI with slide text immediately
      const seeded = slides.map((s: any, idx: number) => ({
        ...s,
        template: s.template || (idx === 0 ? 'intro' : idx === slides.length - 1 ? 'outro' : 'standard'),
        imageUrl: null,
      }));
      setInstagramCarouselSlidesData(seeded);
      setInstagramCarouselCaption(caption);
      setInstagramCarouselPromptLog('');
      setInstagramCarouselLastPrompt('');

      // 2) Generate cover first, then parallelize the rest and progressively update
      const total = slides.length;
      setCarouselProgress({ total, done: 0, activeSlide: 0 });

      const beats = ['Hook/Cover', 'Core Problem', 'Supporting Insight/Data', 'Market Impact', 'Broader Implications', 'CTA/What to Watch'];

      const runSlide = async (i: number, quality: 'cover' | 'fast') => {
        setCarouselProgress((p) => (p ? { ...p, activeSlide: i } : p));
        const s = slides[i];
        const r = await fetch('/api/generate/instagram-carousel/slide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            theme,
            masterPlate,
            style: instagramCarouselStyle,
            template: s.template || (i === 0 ? 'intro' : i === total - 1 ? 'outro' : 'standard'),
            slideId: s.id,
            index: i,
            total,
            beat: beats[i] || 'Story Beat',
            motif: s.motif,
            placement: s.placement,
            quality,
          }),
        });
        const out = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(out?.error || `Slide ${i + 1} failed (${r.status})`);

        const imageUrl = out?.imageUrl ?? null;
        const cropX = typeof out?.cropX === 'number' ? out.cropX : null;
        const motifUrl = out?.motifUrl ?? null;
        const placementOut = out?.placement ?? null;
        const promptUsed = typeof out?.promptUsed === 'string' ? out.promptUsed : '';
        const motifPromptUsed = typeof out?.motifPromptUsed === 'string' ? out.motifPromptUsed : '';

        if (promptUsed) {
          setInstagramCarouselLastPrompt(promptUsed);
          setInstagramCarouselPromptLog((prev) =>
            [prev, `--- Slide ${i + 1} (${s.id}) prompt ---\n${promptUsed}`].filter(Boolean).join('\n\n')
          );
        }
        if (motifPromptUsed) {
          setInstagramCarouselPromptLog((prev) =>
            [prev, `--- Slide ${i + 1} (${s.id}) motif prompt ---\n${motifPromptUsed}`].filter(Boolean).join('\n\n')
          );
        }

        setInstagramCarouselSlidesData((prev) => {
          if (!prev) return prev;
          return prev.map((x: any) =>
            x.id === s.id ? { ...x, imageUrl, cropX, motifUrl, placement: placementOut, promptUsed } : x
          );
        });

        setCarouselProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
      };

      if (instagramCarouselGenerationMode === 'sequential') {
        // True sequential: generate one slide, render it, then move to the next.
        for (let i = 0; i < slides.length; i += 1) {
          // cover quality for first slide only
          // eslint-disable-next-line no-await-in-loop
          await runSlide(i, i === 0 ? 'cover' : 'fast');
        }
      } else {
        // Master plate mode: cover first, then parallelize the rest.
        await runSlide(0, 'cover');
        await Promise.allSettled(slides.slice(1).map((_: any, idx: number) => runSlide(idx + 1, 'fast')));
      }

      toast.success('Carousel images generated');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to generate carousel images');
    } finally {
      setCarouselProgress(null);
      setIsGeneratingCarouselImages(false);
    }
  }, [mode, selectedContentTypes, kitTypes, selectedSourceIds, instagramCarouselSlides, instagramCarouselGenerationMode]);

  const handleGenerateKit = useCallback(async () => {
    if (!kitTypes.length) {
      toast.error('Select at least one content type for the kit');
      return;
    }

    setIsGeneratingKit(true);
    setKitOutputs(null);

    try {
      const response = await fetch('/api/generate', {
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
      });

      if (!response.ok) throw new Error('KIT generation failed');

      const payload = await response.json().catch(() => ({}));
      const outputs = Array.isArray(payload?.outputs) ? payload.outputs : null;
      setKitOutputs(outputs);

      // If KIT includes Instagram + images are enabled in carousel mode, generate carousel images too.
      if (includeInstagramImage && instagramImageMode === 'carousel' && kitTypes.includes('social-instagram')) {
        await handleGenerateInstagramCarousel();
      }

      toast.success('KIT generated');
    } catch (err) {
      console.error('KIT generation error:', err);
      toast.error('Failed to generate kit');
    } finally {
      setIsGeneratingKit(false);
    }
  }, [kitTypes, includeInstagramImage, instagramImageMode, handleGenerateInstagramCarousel, selectedSourceIds, customPrompt, tone, additionalContext]);

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
          instagramCarouselSlides,
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
          else if (/Image generation status: failed/i.test(txt)) setImageStatus('Instagram image failed (see output section)');
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
            <h1 className="text-2xl font-bold tracking-tight">Generate Social Content</h1>
            <p className="text-muted-foreground">Transform your articles into engaging social media content.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button className="rounded-2xl" onClick={() => router.push('/library')} variant="outline">
            Saved Drafts
          </Button>
          <Button
            className="rounded-2xl bg-violet-600 hover:bg-violet-600/90"
            onClick={mode === 'single' ? handleGenerate : undefined}
            disabled={mode === 'single' ? isGenerating : false}
          >
            Generate
          </Button>
        </div>
      </div>

      <GenerationModeToggle mode={mode} onChange={setMode} />

      {mode === 'kit' ? (
        <div className="space-y-6">
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
                setIncludeInstagramCarouselImages((v) => {
                  const next = !v;
                  if (next) setInstagramImageModalOpen(true);
                  return next;
                });
              }}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
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

            <div>
              <h2 className="mb-3 text-lg font-semibold">3. Source Content</h2>
              <SourceArticlePicker
                selectedId={selectedSourceIds[0] ?? null}
                onSelect={(id) => setSelectedSourceIds(id ? [id] : [])}
              />
            </div>
          </div>

          <InstagramImageModal
            open={instagramImageModalOpen}
            onOpenChange={setInstagramImageModalOpen}
            mode={instagramImageMode}
            setMode={setInstagramImageMode}
            slideCount={instagramCarouselSlides}
            setSlideCount={setInstagramCarouselSlides}
            generationMode={instagramCarouselGenerationMode}
            setGenerationMode={setInstagramCarouselGenerationMode}
            onConfirm={() => setInstagramImageModalOpen(false)}
          />

          <div>
            <h2 className="mb-3 text-lg font-semibold">4. Generated Output</h2>
            <KitGeneratedOutput
              selectedTypes={kitTypes}
              outputs={kitOutputs}
              isGenerating={isGeneratingKit}
              onGenerate={handleGenerateKit}
            />
          </div>

          {/* Instagram carousel image preview (KIT) */}
          {includeInstagramImage && instagramImageMode === 'carousel' && kitTypes.includes('social-instagram') ? (
            <div>
              <h2 className="mb-3 text-lg font-semibold">5. Instagram Carousel Images</h2>
              <InstagramCarouselPanel
                enabled={true}
                onEnabledChange={() => {}}
                slideCount={instagramCarouselSlides}
                onSlideCountChange={setInstagramCarouselSlides}
                slides={instagramCarouselSlidesData ?? undefined}
                theme={instagramCarouselTheme ?? undefined}
                caption={instagramCarouselCaption}
                onCaptionChange={setInstagramCarouselCaption}
                onGenerate={handleGenerateInstagramCarousel}
                onSample={handleSampleInstagramCarousel}
                progress={carouselProgress}
                isGenerating={isGeneratingCarouselImages}
                canGenerate={!!selectedSourceIds.length}
                promptLog={instagramCarouselPromptLog}
                lastPrompt={instagramCarouselLastPrompt}
                styleVariant={instagramCarouselStyle}
                onStyleVariantChange={setInstagramCarouselStyle}
              />
            </div>
          ) : null}
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
                    setIncludeInstagramImage((v) => {
                      const next = !v;
                      if (next) setInstagramImageModalOpen(true);
                      return next;
                    });
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
            <h2 className="mb-3 text-lg font-semibold">3. Source Content</h2>
            <SourceArticlePicker
              selectedId={selectedSourceIds[0] ?? null}
              onSelect={(id) => setSelectedSourceIds(id ? [id] : [])}
            />
          </div>

          {selectedContentTypes[0] === 'social-instagram' && includeInstagramImage && instagramImageMode === 'carousel' ? (
            <div>
              <h2 className="mb-3 text-lg font-semibold">4. Instagram Carousel Images</h2>
              <InstagramCarouselPanel
                enabled={true}
                onEnabledChange={() => {}}
                slideCount={instagramCarouselSlides}
                onSlideCountChange={setInstagramCarouselSlides}
                slides={instagramCarouselSlidesData ?? undefined}
                theme={instagramCarouselTheme ?? undefined}
                caption={instagramCarouselCaption}
                onCaptionChange={setInstagramCarouselCaption}
                onGenerate={handleGenerateInstagramCarousel}
                onSample={handleSampleInstagramCarousel}
                progress={carouselProgress}
                isGenerating={isGeneratingCarouselImages}
                canGenerate={!!selectedSourceIds.length}
                promptLog={instagramCarouselPromptLog}
                lastPrompt={instagramCarouselLastPrompt}
                styleVariant={instagramCarouselStyle}
                onStyleVariantChange={setInstagramCarouselStyle}
              />
            </div>
          ) : null}

          <InstagramImageModal
            open={instagramImageModalOpen}
            onOpenChange={(v) => {
              setInstagramImageModalOpen(v);
              if (!v && !includeInstagramImage) return;
            }}
            mode={instagramImageMode}
            setMode={setInstagramImageMode}
            slideCount={instagramCarouselSlides}
            setSlideCount={setInstagramCarouselSlides}
            generationMode={instagramCarouselGenerationMode}
            setGenerationMode={setInstagramCarouselGenerationMode}
            onConfirm={() => {
              setInstagramImageModalOpen(false);
              if (instagramImageMode === 'carousel') {
                setInstagramCarouselSlidesData(null);
                setInstagramCarouselCaption('');
              }
            }}
          />

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

    </div>
  );
}
