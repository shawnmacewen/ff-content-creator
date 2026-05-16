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
  const [includeInstagramImage, setIncludeInstagramImage] = useState(false);
  const [instagramImageModalOpen, setInstagramImageModalOpen] = useState(false);
  const [instagramImageMode, setInstagramImageMode] = useState<'single' | 'carousel'>('single');
  const [instagramCarouselSlides, setInstagramCarouselSlides] = useState<number>(6);

  const [instagramCarouselSlidesData, setInstagramCarouselSlidesData] = useState<any[] | null>(null);
  const [instagramCarouselCaption, setInstagramCarouselCaption] = useState<string>('');

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

    try {
      const res = await fetch('/api/generate/instagram-carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceContentIds: selectedSourceIds,
          slideCount: instagramCarouselSlides,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'Carousel generation failed');

      const slides = Array.isArray(payload?.slides) ? payload.slides : [];
      const images = Array.isArray(payload?.images) ? payload.images : [];
      const caption = String(payload?.caption || '');

      const byId = new Map(images.map((i: any) => [i.slideId, i.imageUrl]));
      const merged = slides.map((s: any) => ({ ...s, imageUrl: byId.get(s.id) ?? null }));

      setInstagramCarouselSlidesData(merged);
      setInstagramCarouselCaption(caption);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate carousel images');
    }
  }, [mode, selectedContentTypes, kitTypes, selectedSourceIds, instagramCarouselSlides]);

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
            <KitFormatSelector selected={kitTypes} onToggle={toggleKitType} />
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

              <div className="mt-4">
                <ContentTypeSelector
                  selected={kitTypes}
                  // allow multi-select in KIT
                  onToggle={toggleKitType}
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

            <div>
              <h2 className="mb-3 text-lg font-semibold">3. Source Content</h2>
              <SourceArticlePicker
                selectedId={selectedSourceIds[0] ?? null}
                onSelect={(id) => setSelectedSourceIds(id ? [id] : [])}
              />
            </div>
          </div>

          {/* Instagram carousel image preview (KIT) */}
          {includeInstagramImage && instagramImageMode === 'carousel' && kitTypes.includes('social-instagram') ? (
            <div>
              <h2 className="mb-3 text-lg font-semibold">4. Instagram Carousel Images</h2>
              <InstagramCarouselPanel
                enabled={true}
                onEnabledChange={() => {}}
                slideCount={instagramCarouselSlides}
                onSlideCountChange={setInstagramCarouselSlides}
                slides={instagramCarouselSlidesData ?? undefined}
                caption={instagramCarouselCaption}
                onCaptionChange={setInstagramCarouselCaption}
              />
              <div className="mt-3 flex justify-end">
                <Button
                  className="rounded-2xl bg-violet-600 hover:bg-violet-600/90"
                  type="button"
                  onClick={handleGenerateInstagramCarousel}
                  disabled={!selectedSourceIds.length}
                >
                  Generate Carousel Images
                </Button>
              </div>
            </div>
          ) : null}

          <InstagramImageModal
            open={instagramImageModalOpen}
            onOpenChange={setInstagramImageModalOpen}
            mode={instagramImageMode}
            setMode={setInstagramImageMode}
            slideCount={instagramCarouselSlides}
            setSlideCount={setInstagramCarouselSlides}
            onConfirm={() => setInstagramImageModalOpen(false)}
          />

          <div>
            <h2 className="mb-3 text-lg font-semibold">5. Generated Output</h2>
            <KitGeneratedOutput
              selectedTypes={kitTypes}
              outputs={kitOutputs}
              isGenerating={isGeneratingKit}
              onGenerate={handleGenerateKit}
            />
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
                caption={instagramCarouselCaption}
                onCaptionChange={setInstagramCarouselCaption}
              />
              <div className="mt-3 flex justify-end">
                <Button
                  className="rounded-2xl bg-violet-600 hover:bg-violet-600/90"
                  type="button"
                  onClick={handleGenerateInstagramCarousel}
                  disabled={!selectedSourceIds.length}
                >
                  Generate Carousel Images
                </Button>
              </div>
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
