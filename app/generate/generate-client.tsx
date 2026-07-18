'use client';

import { useState, useEffect, useCallback, useRef, type ComponentType } from 'react';
import useSWR from 'swr';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ContentTypeSelector } from '@/components/generator/content-type-selector';
import { SourceArticlePicker } from '@/components/generator/source-article-picker';
import { ToneControls } from '@/components/generator/tone-controls';
import { GenerationPreview } from '@/components/generator/generation-preview';
import { GeneratingOutputState } from '@/components/generator/generating-dots';
import { GenerationModeToggle, type GenerationMode } from '@/components/generator/generation-mode-toggle';
import { KitGeneratedOutput, type KitOutputStatus } from '@/components/generator/kit-generated-output';
import { SelectedArticlePreview } from '@/components/generator/selected-article-preview';
import { ContentDetail } from '@/components/source-content/content-detail';

import { KitContentTypeSelector } from '@/components/generator/kit-content-type-selector';
import { generateId } from '@/lib/storage/local-storage';
import type { ContentType, ToneType, ContentStatus, GeneratedContent } from '@/lib/types/content';
import { CONTENT_TYPE_MAP } from '@/lib/content-config';
import {
  Bookmark,
  CheckCircle2,
  Edit3,
  FileText,
  Grid2X2,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  Save,
  Sparkles,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import InstagramCarousel2Client, {
  type InstagramCarousel2ClientHandle,
  type InstagramCarouselProgress,
  type InstagramCarouselVisualStyle,
} from '@/app/instagram-carousel-2/instagram-carousel-2-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

type WorkflowStep = 1 | 2 | 3;

const iconByContentType: Partial<Record<ContentType, ComponentType<{ className?: string }>>> = {
  'social-instagram': Instagram,
  'social-linkedin': Linkedin,
  'email-marketing': Mail,
};

function toneLabel(tone: ToneType) {
  return tone.charAt(0).toUpperCase() + tone.slice(1);
}

function toneDescription(tone: ToneType) {
  const descriptions: Partial<Record<ToneType, string>> = {
    professional: 'Clear, credible, and client-friendly',
    casual: 'Relaxed and approachable',
    friendly: 'Warm and personable',
    authoritative: 'Expert and confident',
    conversational: 'Natural and easy to read',
    urgent: 'Timely and action-oriented',
  };
  return descriptions[tone] || 'Ready for review';
}

function compactOutputLabel(type: ContentType, instagramVariant?: 'single' | 'carousel' | null) {
  if (type === 'social-instagram') return instagramVariant === 'carousel' ? 'Instagram carousel' : 'Instagram post';
  if (type === 'email-marketing') return 'Marketing email';
  if (type === 'social-linkedin') return 'LinkedIn post';
  return CONTENT_TYPE_MAP[type]?.label ?? type;
}

function WorkflowStepMarker({
  step,
  active,
  complete,
}: {
  step: WorkflowStep;
  active?: boolean;
  complete?: boolean;
}) {
  if (complete && !active) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
        <CheckCircle2 className="h-5 w-5" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
        active ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-700'
      )}
    >
      {step}
    </span>
  );
}

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<WorkflowStep>(3);
  const [usePlainLanguage, setUsePlainLanguage] = useState(true);
  const [includeCallToAction, setIncludeCallToAction] = useState(true);
  const [audience, setAudience] = useState('Clients and prospects');

  const selectedSourceId = selectedSourceIds[0] ?? null;
  const { data: selectedSource } = useSWR<any>(
    selectedSourceId ? `/api/source-content/${selectedSourceId}` : null,
    fetcher
  );
  const detailContent = selectedSource?.data ?? selectedSource ?? null;

  const normalizedBodyPreview = (() => {
    const raw = String(detailContent?.body || detailContent?.bodyText || '');
    const decoded = decodeEntitiesLite(raw);

    return decoded
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<paragraph[^>]*>([\s\S]*?)<\/paragraph>/gi, '$1\n\n')
      .replace(/<container_text[^>]*>([\s\S]*?)<\/container_text>/gi, '\n\n$1\n')
      .replace(/<document_title[^>]*>([\s\S]*?)<\/document_title>/gi, '\n\n$1\n')
      .replace(/<short_title[^>]*>([\s\S]*?)<\/short_title>/gi, '\n\n$1\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, '')
      .replace(/\t/g, ' ')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  })();

  const handleSourceSelect = useCallback((id: string | null) => {
    setSelectedSourceIds(id ? [id] : []);
    setSetupCollapsed(false);
  }, []);

  const handleClearSource = useCallback(() => {
    setSelectedSourceIds([]);
    setSetupCollapsed(false);
    setDetailOpen(false);
  }, []);

  const handleUseDetailArticle = useCallback(() => {
    toast.success('Article selected for generation');
  }, []);

  const handleOpenSelectedDetails = useCallback(() => {
    if (!detailContent) {
      toast.error('Select an article first');
      return;
    }
    setDetailOpen(true);
  }, [detailContent]);

  const [mode, setMode] = useState<GenerationMode>('kit');

  const [kitOutputTab, setKitOutputTab] = useState<'carousel' | ContentType | 'all'>('all');

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
  const [instagramImageMode, setInstagramImageMode] = useState<'single' | 'carousel'>('single');

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
  const [kitCarouselProgress, setKitCarouselProgress] = useState<InstagramCarouselProgress | null>(null);
  const hasRenderedKitOutputs = Boolean(kitOutputs?.some((output) => output.content?.trim()));

  // Carousel 2.0 settings (KIT multipost)
  const [kitCarouselSlideCount, setKitCarouselSlideCount] = useState<number>(3);
  const [kitCarouselModel, setKitCarouselModel] = useState<'gpt-image-2' | 'gpt-image-1'>('gpt-image-2');
  const [kitCarouselCohesionMethod, setKitCarouselCohesionMethod] = useState<'prompt' | 'image-ref'>('image-ref');
  const [kitCarouselImageRefMode, setKitCarouselImageRefMode] = useState<'previous' | 'first'>('previous');
  const [kitCarouselMoreSeamlessBackground, setKitCarouselMoreSeamlessBackground] = useState<boolean>(true);
  const [kitCarouselVisualStyle, setKitCarouselVisualStyle] = useState<InstagramCarouselVisualStyle>('classic');
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
      setSelectedSourceIds(ids);
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

    void handle.generate()
      .catch((err) => {
        console.error('KIT carousel generation error:', err);
        toast.error('Carousel image generation failed');
      })
      .finally(() => {
        setPendingKitCarouselGenerate(false);
      });
  }, [pendingKitCarouselGenerate, kitTypes, instagramKitVariant, includeInstagramCarouselImages]);

  const toggleKitType = (t: ContentType) => {
    setKitTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const handleToggleTypeSingle = (t: ContentType) => {
    // single asset → choose exactly one
    setSelectedContentTypes([t]);
  };

  const getKitTypeStatus = useCallback((type: ContentType): KitOutputStatus => {
    if (kitOutputs?.some((output) => output.type === type && output.content?.trim())) return 'complete';
    if (isGeneratingKit && kitTypes.includes(type)) return 'generating';
    return 'idle';
  }, [isGeneratingKit, kitOutputs, kitTypes]);

  const kitOutputStatuses = kitTypes.reduce<Partial<Record<ContentType, KitOutputStatus>>>((acc, type) => {
    acc[type] = getKitTypeStatus(type);
    return acc;
  }, {});

  const hasInstagramCarousel = kitTypes.includes('social-instagram') &&
    instagramKitVariant === 'carousel' &&
    includeInstagramCarouselImages;

  const carouselStatusLabel = (() => {
    if (!hasInstagramCarousel) return null;
    if (pendingKitCarouselGenerate) return 'Waiting to start image generation';
    if (!kitCarouselProgress && !isGeneratingKitCarouselImages) return 'Ready to generate images';
    if (!kitCarouselProgress) return 'Generating carousel images';
    if (kitCarouselProgress.stage === 'complete') {
      return `${kitCarouselProgress.done}/${kitCarouselProgress.total} images complete`;
    }
    if (kitCarouselProgress.stage === 'failed') {
      return `${kitCarouselProgress.done}/${kitCarouselProgress.total} images completed before the run stopped`;
    }
    if (kitCarouselProgress.stage === 'background') {
      return `${kitCarouselProgress.done}/${kitCarouselProgress.total} slide images complete; finishing preview background`;
    }
    return `${kitCarouselProgress.done}/${kitCarouselProgress.total} images complete`;
  })();

  const renderStatusIcon = (status: KitOutputStatus) => {
    if (status === 'complete') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
    if (status === 'generating') return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
    return null;
  };


  useEffect(() => {
    // Default output tab behavior:
    // - If Instagram multipost images are enabled, start on Carousel.
    // - Otherwise start on the last tab: All.
    if (kitTypes.includes('social-instagram') && instagramKitVariant === 'carousel' && includeInstagramCarouselImages) {
      setKitOutputTab('carousel');
    } else {
      setKitOutputTab('all');
    }
  }, [kitTypes, instagramKitVariant, includeInstagramCarouselImages]);

  const handleGenerateKit = useCallback(async () => {
    if (!kitTypes.length) {
      toast.error('Select at least one content type for the kit');
      return;
    }

    setIsGeneratingKit(true);
    setKitOutputs(null);
    setKitCarouselProgress(null);

    const shouldGenerateCarousel = kitTypes.includes('social-instagram') &&
      instagramKitVariant === 'carousel' &&
      includeInstagramCarouselImages &&
      selectedSourceIds.length === 1;
    const shouldGenerateInlineInstagramImage = kitTypes.includes('social-instagram') &&
      instagramKitVariant === 'single' &&
      includeInstagramSingleImages;
    const guidanceContext = [
      additionalContext,
      usePlainLanguage ? 'Use plain language.' : '',
      includeCallToAction ? 'Include a clear call to action.' : '',
      audience ? `Audience: ${audience}.` : '',
    ].filter(Boolean).join('\n');

    try {
      // Generate KIT text first so non-Instagram outputs show ASAP.
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // type is ignored for kit mode but we send a stable value
          type: kitTypes[0],
          mode: 'kit',
          selectedTypes: kitTypes,
          includeInstagramImage: shouldGenerateInlineInstagramImage,
          sourceContentIds: selectedSourceIds,
          customPrompt,
          tone,
          additionalContext: guidanceContext,
        }),
      });

      if (!response.ok) throw new Error('KIT generation failed');
      const payload = await response.json().catch(() => ({}));
      const outputs = Array.isArray(payload?.outputs) ? payload.outputs : null;
      setKitOutputs(outputs);
      setSetupCollapsed(true);
      setIsGeneratingKit(false);

      // Carousel images run asynchronously so text outputs stay usable while image generation continues.
      if (shouldGenerateCarousel) {
        if (kitCarousel2Ref.current) {
          void kitCarousel2Ref.current.generate().catch((err) => {
            console.error('KIT carousel generation error:', err);
            toast.error('Carousel image generation failed');
          });
        } else {
          setPendingKitCarouselGenerate(true);
        }
      }

      if (kitTypes.includes('social-instagram') && instagramKitVariant === 'carousel' && includeInstagramCarouselImages && selectedSourceIds.length !== 1) {
        toast.info('KIT copy generated. Select exactly one source article to generate carousel images.');
      }

      toast.success(shouldGenerateCarousel ? 'KIT copy generated; carousel images are running' : 'KIT generated');
    } catch (err) {
      console.error('KIT generation error:', err);
      toast.error('Failed to generate kit');
    } finally {
      setIsGeneratingKit(false);
    }
  }, [kitTypes, includeInstagramSingleImages, instagramKitVariant, includeInstagramCarouselImages, kitCarousel2Ref, selectedSourceIds, customPrompt, tone, additionalContext, usePlainLanguage, includeCallToAction, audience]);

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
    const shouldGenerateInlineInstagramImage = primaryType === 'social-instagram' &&
      includeInstagramImage &&
      instagramImageMode === 'single';
    const guidanceContext = [
      additionalContext,
      usePlainLanguage ? 'Use plain language.' : '',
      includeCallToAction ? 'Include a clear call to action.' : '',
      audience ? `Audience: ${audience}.` : '',
    ].filter(Boolean).join('\n');
    setImageStatus(shouldGenerateInlineInstagramImage ? 'Generating Instagram single image...' : null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: primaryType,
          mode: 'single',
          includeInstagramImage: shouldGenerateInlineInstagramImage,
          instagramImageMode,
          sourceContentIds: selectedSourceIds,
          customPrompt,
          tone,
          additionalContext: guidanceContext,
        }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const contentTypeHeader = response.headers.get('content-type') || '';
      if (contentTypeHeader.includes('application/json')) {
        const payload = await response.json();
        setGeneratedContent(payload?.content || '');
        setCompliance(payload?.compliance || null);
        setGeneratedImages(payload?.images || {});
        setSetupCollapsed(true);
        if (shouldGenerateInlineInstagramImage) {
          const txt = String(payload?.content || '');
          if (/Image URL:|Image generation status: success/i.test(txt)) setImageStatus('Instagram single image generated');
          else if (/Image generation status: failed/i.test(txt)) setImageStatus('Instagram image failed — see output section');
          else setImageStatus('Instagram image status unknown');
        }
      } else {
        setGeneratedContent(await response.text());
        setSetupCollapsed(true);
      }

      toast.success('Content generated');
    } catch (err) {
      console.error('Generation error:', err);
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedContentTypes, includeInstagramImage, instagramImageMode, selectedSourceIds, customPrompt, tone, additionalContext, usePlainLanguage, includeCallToAction, audience]);

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

  const hasGeneratedOutput = mode === 'kit'
    ? Boolean(kitOutputs || hasRenderedKitOutputs || pendingKitCarouselGenerate || isGeneratingKitCarouselImages)
    : Boolean(generatedContent.trim() || Object.keys(generatedImages).length);
  const activeTypes = mode === 'kit' ? kitTypes : selectedContentTypes;
  const selectedOutputLabels = activeTypes.map((type) => compactOutputLabel(type, instagramKitVariant));
  const selectedSourceLabel = selectedSourceIds.length
    ? `${selectedSourceIds.length} article${selectedSourceIds.length === 1 ? '' : 's'} selected`
    : 'Choose your article';
  const generateDisabled = mode === 'kit'
    ? isGeneratingKit || isGeneratingKitCarouselImages || !kitTypes.length || !selectedSourceIds.length
    : isGenerating || !selectedContentTypes.length || !selectedSourceIds.length;
  const isSetupCollapsed = setupCollapsed && hasGeneratedOutput;
  const setupTrayClassName = cn(
    'space-y-6 overflow-hidden transition-[max-height,opacity,transform] duration-500 ease-in-out',
    isSetupCollapsed
      ? 'pointer-events-none max-h-0 -translate-y-6 opacity-0'
      : 'max-h-[3200px] translate-y-0 opacity-100'
  );
  const handleModeChange = (nextMode: GenerationMode) => {
    setMode(nextMode);
    setSetupCollapsed(false);
  };

  return (
    <div className="flex w-full max-w-none flex-col gap-4 pb-20">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-1 pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-tight tracking-normal text-slate-950">Generate Content</h1>
            <p className="mt-1 text-sm text-slate-600">Turn one trusted article into a coordinated marketing campaign.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-fit gap-2 rounded-md bg-white"
            onClick={() => router.push('/library')}
          >
            <Bookmark className="h-4 w-4" />
            Saved drafts
          </Button>
        </div>
        <GenerationModeToggle mode={mode} onChange={handleModeChange} />
      </div>

      <div className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-3">
        {([
          { step: 1 as WorkflowStep, title: mode === 'kit' ? 'Choose outputs' : 'Choose asset', detail: selectedOutputLabels.length ? selectedOutputLabels.slice(0, 1).join('') + (selectedOutputLabels.length > 1 ? ` + ${selectedOutputLabels.length - 1} more` : '') : 'Select output' },
          { step: 2 as WorkflowStep, title: 'Set guidance', detail: toneLabel(tone) },
          { step: 3 as WorkflowStep, title: 'Select source', detail: selectedSourceLabel },
        ]).map((item) => {
          const active = activeWorkflowStep === item.step;
          const complete = item.step === 1 ? activeTypes.length > 0 : item.step === 2 ? Boolean(tone) : selectedSourceIds.length > 0;
          return (
            <button
              key={item.step}
              type="button"
              onClick={() => setActiveWorkflowStep(item.step)}
              className={cn(
                'flex min-h-[76px] items-center gap-4 border-slate-200 px-5 text-left transition-colors hover:bg-slate-50 lg:border-r last:lg:border-r-0',
                active && 'bg-blue-50/70'
              )}
            >
              <WorkflowStepMarker step={item.step} active={active} complete={complete} />
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-slate-950">{item.step}</span>
                  <span className="font-semibold text-slate-950">{item.title}</span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-600">{active ? 'Editing' : item.detail}</p>
              </div>
            </button>
          );
        })}
      </div>

      {hasGeneratedOutput ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-md"
            onClick={() => setSetupCollapsed((value) => !value)}
          >
            {isSetupCollapsed ? 'Show setup controls' : 'Hide setup controls'}
          </Button>
        </div>
      ) : null}

      {mode === 'kit' ? (
        <div className="space-y-6">
          <div className={setupTrayClassName}>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold', activeWorkflowStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-emerald-100 text-emerald-800')}>1</span>
                <div>
                  <h2 className="text-lg font-semibold">Campaign outputs</h2>
                </div>
                {activeWorkflowStep !== 1 ? (
                  <Button type="button" variant="ghost" size="sm" className="ml-auto text-primary" onClick={() => setActiveWorkflowStep(1)}>
                    Edit
                  </Button>
                ) : null}
              </div>
              {activeWorkflowStep === 1 ? (
                <>
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
                <Card className="mt-6 rounded-lg border-border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Instagram Carousel</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <label className="text-sm">
                        <div className="text-xs text-muted-foreground mb-1">Slides</div>
                        <select
                          className="w-full rounded-md border bg-background px-3 py-2"
                          value={kitCarouselSlideCount}
                          onChange={(e) => setKitCarouselSlideCount(Number(e.target.value) || 3)}
                        >
                          <option value={3}>3</option>
                          <option value={6}>6</option>
                          <option value={9}>9</option>
                        </select>
                      </label>

                      <label className="text-sm">
                        <div className="text-xs text-muted-foreground mb-1">Template Style</div>
                        <select
                          className="w-full rounded-md border bg-background px-3 py-2"
                          value={kitCarouselVisualStyle}
                          onChange={(e) => setKitCarouselVisualStyle(e.target.value as InstagramCarouselVisualStyle)}
                        >
                          <option value="classic">Classic Current Look</option>
                          <option value="bright-editorial">Bright Editorial</option>
                        </select>
                      </label>

                      <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
                        <Button
                          type="button"
                          variant={kitCarouselAdvanced ? 'default' : 'outline'}
                          className="h-10 rounded-md"
                          onClick={() => setKitCarouselAdvanced((v) => !v)}
                        >
                          Additional Options
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-md"
                          onClick={() => kitCarousel2Ref.current?.openPromptLog()}
                          title="View generation prompt log"
                        >
                          <ScrollText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {kitCarouselAdvanced ? (
                      <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="text-sm">
                            <div className="text-xs text-muted-foreground mb-1">Model</div>
                            <select
                              className="w-full rounded-md border bg-background px-3 py-2"
                              value={kitCarouselModel}
                              onChange={(e) => setKitCarouselModel(e.target.value as any)}
                            >
                              <option value="gpt-image-2">gpt-image-2</option>
                              <option value="gpt-image-1">gpt-image-1</option>
                            </select>
                          </label>

                          <label className="text-sm">
                            <div className="text-xs text-muted-foreground mb-1">Cohesion</div>
                            <select
                              className="w-full rounded-md border bg-background px-3 py-2"
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
                              className="w-full rounded-md border bg-background px-3 py-2"
                              value={kitCarouselImageRefMode}
                              onChange={(e) => setKitCarouselImageRefMode(e.target.value as any)}
                              disabled={kitCarouselCohesionMethod !== 'image-ref'}
                            >
                              <option value="previous">Previous</option>
                              <option value="first">First</option>
                            </select>
                          </label>

                          <label className="inline-flex items-center gap-2 self-end pb-2 text-sm">
                            <input
                              type="checkbox"
                              checked={kitCarouselMoreSeamlessBackground}
                              onChange={(e) => setKitCarouselMoreSeamlessBackground(e.target.checked)}
                            />
                            More Seamless background
                          </label>
                        </div>

                        <div className="text-xs font-semibold text-muted-foreground">Carousel prompt (optional add-on)</div>
                        <textarea
                          className="w-full min-h-[84px] rounded-md border bg-background px-3 py-2 text-sm"
                          value={kitCarouselPrompt}
                          onChange={(e) => setKitCarouselPrompt(e.target.value)}
                        />
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
                  ) : null}
                  <div className="mt-4 flex justify-end gap-2">
                    <Button type="button" variant="outline" className="rounded-md" onClick={() => setActiveWorkflowStep(3)}>Cancel</Button>
                    <Button type="button" className="rounded-md" onClick={() => setActiveWorkflowStep(3)}>Save outputs</Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {activeTypes.map((type) => {
                      const Icon = iconByContentType[type] || FileText;
                      return (
                        <span key={type} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                          <Icon className="h-4 w-4" />
                          {compactOutputLabel(type, instagramKitVariant)}
                        </span>
                      );
                    })}
                  </div>
                  {kitTypes.includes('social-instagram') && instagramKitVariant === 'carousel' ? (
                    <p className="text-sm text-slate-600">Carousel - {kitCarouselSlideCount} slides - {kitCarouselVisualStyle === 'classic' ? 'Classic Current Look' : 'Bright Editorial'}</p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold', activeWorkflowStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-emerald-100 text-emerald-800')}>2</span>
                <div>
                  <h2 className="text-lg font-semibold">Writing guidance</h2>
                </div>
                {activeWorkflowStep !== 2 ? (
                  <Button type="button" variant="outline" size="sm" className="ml-auto gap-2 rounded-md" onClick={() => setActiveWorkflowStep(2)}>
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                ) : null}
              </div>
              {activeWorkflowStep === 2 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-950">Tone</div>
                    <div className="flex flex-wrap gap-2">
                      {(['professional', 'casual', 'friendly', 'authoritative', 'conversational', 'urgent'] as ToneType[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setTone(option)}
                          className={cn(
                            'h-10 rounded-md border px-4 text-sm font-medium transition-colors',
                            tone === option ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          {toneLabel(option)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-950">Additional instructions (optional)</span>
                    <textarea
                      className="min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                      placeholder="Add audience, key message, compliance notes, or calls to action..."
                      value={customPrompt}
                      onChange={(event) => setCustomPrompt(event.target.value)}
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-5">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" className="h-4 w-4 accent-primary" checked={usePlainLanguage} onChange={(event) => setUsePlainLanguage(event.target.checked)} />
                      Use plain language
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" className="h-4 w-4 accent-primary" checked={includeCallToAction} onChange={(event) => setIncludeCallToAction(event.target.checked)} />
                      Include a call to action
                    </label>
                    <label className="ml-auto flex min-w-[260px] items-center gap-2 text-sm text-slate-700">
                      <span>Audience:</span>
                      <select
                        value={audience}
                        onChange={(event) => setAudience(event.target.value)}
                        className="h-10 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option>Clients and prospects</option>
                        <option>Existing clients</option>
                        <option>Prospective clients</option>
                        <option>Advisors</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" className="rounded-md" onClick={() => setActiveWorkflowStep(3)}>Cancel</Button>
                    <Button type="button" className="rounded-md" onClick={() => setActiveWorkflowStep(3)}>Save guidance</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-950">{toneLabel(tone)}</h3>
                  <p className="text-sm text-slate-600">{toneDescription(tone)}</p>
                </div>
              )}

            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-3">
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold', activeWorkflowStep === 3 ? 'bg-primary text-primary-foreground' : selectedSourceIds.length ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700')}>3</span>
              <div>
                <h2 className="text-lg font-semibold">Choose a source article</h2>
                <p className="text-sm text-muted-foreground">Select the trusted article EchoWrite should transform into your campaign.</p>
              </div>
            </div>
            <div className="grid items-stretch gap-5 xl:h-[720px] xl:max-h-[720px] xl:min-h-0 xl:overflow-hidden xl:grid-cols-[minmax(390px,42%)_minmax(0,58%)] 2xl:grid-cols-[minmax(420px,42%)_minmax(0,58%)]">
              <div className="min-h-0 xl:h-full">
                <SourceArticlePicker
                  className="xl:h-full"
                  selectedId={selectedSourceIds[0] ?? null}
                  onSelect={handleSourceSelect}
                  splitView
                />
              </div>

              <SelectedArticlePreview
                className="xl:h-full"
                selectedSource={selectedSource}
                detailContent={detailContent}
                bodyPreview={normalizedBodyPreview}
                onClear={handleClearSource}
                onUseArticle={handleUseDetailArticle}
                onViewDetails={handleOpenSelectedDetails}
                campaignCompact
              />
            </div>
            {selectedSourceIds.length > 1 ? (
              <div className="mt-3 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                {selectedSourceIds.length} source articles are selected from Source Content. The first article is shown as the preview anchor, and all selected sources will be included in the generated copy. Carousel image generation still requires exactly one source.
              </div>
            ) : null}
          </div>

          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">4</span>
              <div>
                <h2 className="text-lg font-semibold">Generated Output</h2>
                <p className="text-sm text-muted-foreground">Review carousel images and campaign copy before saving.</p>
              </div>
            </div>

            {(isGeneratingKit && !hasRenderedKitOutputs) ? (
              <div className="mb-4">
                <GeneratingOutputState
                  label="Generating editorial assets"
                  detail="The selected content formats are being drafted and will appear here as soon as the request completes."
                />
              </div>
            ) : null}

            <div className="rounded-lg border bg-background p-3">
              <div className="flex flex-wrap gap-2">
                {kitTypes.includes('social-instagram') && instagramKitVariant === 'carousel' && includeInstagramCarouselImages ? (
                  <button
                    type="button"
                    onClick={() => setKitOutputTab('carousel')}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-colors',
                      kitOutputTab === 'carousel'
                        ? 'border-primary/60 bg-primary/10 text-primary'
                        : 'bg-background/60 hover:bg-background'
                    )}
                  >
                    {(pendingKitCarouselGenerate || isGeneratingKitCarouselImages) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : kitCarouselProgress?.stage === 'complete' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : null}
                    Instagram Carousel
                  </button>
                ) : null}


                {kitTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setKitOutputTab(t)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-colors',
                      kitOutputTab === t
                        ? 'border-primary/60 bg-primary/10 text-primary'
                        : 'bg-background/60 hover:bg-background'
                    )}
                  >
                    {renderStatusIcon(getKitTypeStatus(t))}
                    {CONTENT_TYPE_MAP[t]?.label ?? t}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setKitOutputTab('all')}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-colors',
                    kitOutputTab === 'all'
                      ? 'border-primary/60 bg-primary/10 text-primary'
                      : 'bg-background/60 hover:bg-background'
                  )}
                >
                  {isGeneratingKit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  All
                </button>
              </div>
            </div>

            {/* Keep all mounted; switching tabs must not clear */}
            <div className={cn('mt-3', kitOutputTab !== 'carousel' && 'hidden')}>
              {carouselStatusLabel ? (
                <div className="mb-3 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    {(pendingKitCarouselGenerate || isGeneratingKitCarouselImages) ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
                    <span>{carouselStatusLabel}</span>
                  </div>
                  {kitCarouselProgress ? (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.max(
                            5,
                            Math.min(100, Math.round((kitCarouselProgress.done / Math.max(1, kitCarouselProgress.total)) * 100))
                          )}%`,
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {selectedSourceIds.length !== 1 ? (
                <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
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
                  onProgress={setKitCarouselProgress}
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
                  visualStyle={kitCarouselVisualStyle}
                  onVisualStyleChange={setKitCarouselVisualStyle}
                  showAdvancedPromptInput={kitCarouselAdvanced}
                  onShowAdvancedPromptInputChange={setKitCarouselAdvanced}
                  topic={kitCarouselPrompt}
                  onTopicChange={setKitCarouselPrompt}
                />
              )}
            </div>

            <div className={cn('mt-3', kitOutputTab === 'carousel' && 'hidden')}>
              <KitGeneratedOutput
                selectedTypes={kitTypes}
                outputs={kitOutputs}
                activeType={kitOutputTab === 'all' ? 'all' : (kitOutputTab as any)}
                showTabs={false}
                isGenerating={isGeneratingKit}
                outputStatuses={kitOutputStatuses}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className={setupTrayClassName}>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">1</span>
                  <div>
                    <h2 className="text-lg font-semibold">Select Content Type</h2>
                    <p className="text-sm text-muted-foreground">Choose the output format for this generation.</p>
                  </div>
                </div>
                <ContentTypeSelector
                  selected={selectedContentTypes}
                  onToggle={handleToggleTypeSingle}
                  includeInstagramImage={includeInstagramImage}
                  instagramImageMode={instagramImageMode}
                  onInstagramImageModeChange={setInstagramImageMode}
                  onToggleInstagramImage={() => {
                    setIncludeInstagramImage((v) => !v);
                  }}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">2</span>
                  <div>
                    <h2 className="text-lg font-semibold">Generation Settings</h2>
                    <p className="text-sm text-muted-foreground">Set tone, instructions, and campaign context.</p>
                  </div>
                </div>
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

          <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">3</span>
              <div>
                <h2 className="text-lg font-semibold">Select Content</h2>
                <p className="text-sm text-muted-foreground">Pick the source article that will anchor the output.</p>
              </div>
            </div>
            <div className="grid items-stretch gap-3 xl:h-[720px] xl:max-h-[720px] xl:min-h-0 xl:overflow-hidden xl:grid-cols-[minmax(390px,42%)_minmax(0,58%)] 2xl:grid-cols-[minmax(420px,42%)_minmax(0,58%)]">
              <div className="min-h-0 xl:h-full">
                <SourceArticlePicker
                  className="xl:h-full"
                  selectedId={selectedSourceIds[0] ?? null}
                  onSelect={handleSourceSelect}
                  splitView
                />
              </div>

              <SelectedArticlePreview
                className="xl:h-full"
                selectedSource={selectedSource}
                detailContent={detailContent}
                bodyPreview={normalizedBodyPreview}
                onClear={handleClearSource}
                onUseArticle={handleUseDetailArticle}
                onViewDetails={handleOpenSelectedDetails}
              />
            </div>
            {selectedSourceIds.length > 1 ? (
              <div className="mt-3 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                {selectedSourceIds.length} source articles are selected from Source Content. The first article is shown as the preview anchor, and all selected sources will be included in the generated asset. Instagram carousel image generation still requires exactly one source.
              </div>
            ) : null}
          </div>

          {selectedContentTypes[0] === 'social-instagram' && includeInstagramImage && instagramImageMode === 'carousel' ? (
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">4</span>
                <div>
                  <h2 className="text-lg font-semibold">Instagram Carousel Images</h2>
                  <p className="text-sm text-muted-foreground">Generate the swipeable image set for Instagram.</p>
                </div>
              </div>
              {selectedSourceIds.length !== 1 ? (
                <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
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
          </div>


          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">5</span>
              <div>
                <h2 className="text-lg font-semibold">Preview & Save</h2>
                <p className="text-sm text-muted-foreground">Edit, copy, or save the generated asset.</p>
              </div>
            </div>
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
              onGeneratedImageChange={(key, imageUrl) => {
                setGeneratedImages((prev) => ({ ...prev, [key]: imageUrl }));
                setImageStatus('Instagram image edited');
              }}
            />
          </div>
        </div>
      )}
      <div className="fixed inset-x-4 bottom-3 z-40 rounded-lg border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_14px_44px_rgba(15,23,42,0.18)] backdrop-blur md:left-[calc(var(--sidebar-width,0px)+1rem)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-slate-700">
            <span className="inline-flex items-center gap-2">
              <Grid2X2 className="h-4 w-4 text-slate-500" />
              {activeTypes.length} output{activeTypes.length === 1 ? '' : 's'}
            </span>
            <span className="text-slate-300">-</span>
            <span className="inline-flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              {toneLabel(tone)} tone
            </span>
            <span className="text-slate-300">-</span>
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              {selectedSourceIds.length || 0} source selected
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-md bg-white px-6"
              onClick={() => {
                if (mode === 'single' && generatedContent.trim()) {
                  void handleSave('draft');
                } else {
                  toast.info('Draft saving is available after generation.');
                }
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              Save draft
            </Button>
            <Button
              type="button"
              className="h-11 rounded-md px-6"
              onClick={mode === 'kit' ? handleGenerateKit : handleGenerate}
              disabled={generateDisabled}
            >
              {(isGenerating || isGeneratingKit || isGeneratingKitCarouselImages) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {mode === 'kit' ? 'Generate campaign' : 'Generate asset'}
            </Button>
          </div>
        </div>
      </div>
      <ContentDetail
        content={detailContent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUseForGeneration={handleUseDetailArticle}
      />
    </div>
  );
}
