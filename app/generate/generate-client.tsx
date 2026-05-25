'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

import InstagramCarousel2Client, { type InstagramCarousel2ClientHandle } from '@/app/instagram-carousel-2/instagram-carousel-2-client';

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [mode, setMode] = useState<GenerationMode>('kit');

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

      // If KIT includes Instagram multipost images, generate carousel images too.
      // Note: Section 5 may not be mounted/visible yet (ref can be null), so we support a pending trigger.
      if (kitTypes.includes('social-instagram') && instagramKitVariant === 'carousel' && includeInstagramCarouselImages) {
        if (kitCarousel2Ref.current) {
          await kitCarousel2Ref.current.generate();
        } else {
          setPendingKitCarouselGenerate(true);
        }
      }

      toast.success('KIT generated');
    } catch (err) {
      console.error('KIT generation error:', err);
      toast.error('Failed to generate kit');
    } finally {
      setIsGeneratingKit(false);
    }
  }, [kitTypes, includeInstagramImage, instagramImageMode, instagramKitVariant, includeInstagramCarouselImages, kitCarousel2Ref, selectedSourceIds, customPrompt, tone, additionalContext]);

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
            onClick={mode === 'single' ? handleGenerate : handleGenerateKit}
            disabled={mode === 'single' ? isGenerating : isGeneratingKit}
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
                setIncludeInstagramCarouselImages((v) => !v);
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
          {kitTypes.includes('social-instagram') && instagramKitVariant === 'carousel' && includeInstagramCarouselImages ? (
            <div>
              <h2 className="mb-3 text-lg font-semibold">5. Instagram Carousel Images</h2>
              {selectedSourceIds.length !== 1 ? (
                <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Select exactly 1 source article to generate carousel images.
                </div>
              ) : (
                <InstagramCarousel2Client
                  ref={kitCarousel2Ref}
                  selectedSourceId={selectedSourceIds[0] || null}
                  hideSourcePicker
                  defaultTab="carousel"
                  generateLabel="Generate Images"
                />
              )}
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
            <h2 className="mb-3 text-lg font-semibold">3. Source Content</h2>
            <SourceArticlePicker
              selectedId={selectedSourceIds[0] ?? null}
              onSelect={(id) => setSelectedSourceIds(id ? [id] : [])}
            />
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

    </div>
  );
}
