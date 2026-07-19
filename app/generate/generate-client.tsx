'use client';

import { useState, useEffect, useCallback, useRef, type ComponentType, type ReactNode } from 'react';
import useSWR from 'swr';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ContentTypeSelector } from '@/components/generator/content-type-selector';
import { SourceArticlePicker } from '@/components/generator/source-article-picker';
import { ToneControls } from '@/components/generator/tone-controls';
import { GenerationPreview } from '@/components/generator/generation-preview';
import { GeneratingOutputState } from '@/components/generator/generating-dots';
import type { GenerationMode } from '@/components/generator/generation-mode-toggle';
import { KitGeneratedOutput, type KitOutputStatus } from '@/components/generator/kit-generated-output';
import { SelectedArticlePreview } from '@/components/generator/selected-article-preview';
import { ContentDetail } from '@/components/source-content/content-detail';

import { KitContentTypeSelector } from '@/components/generator/kit-content-type-selector';
import { generateId } from '@/lib/storage/local-storage';
import type { ContentType, ToneType, ContentStatus, GeneratedContent } from '@/lib/types/content';
import { CONTENT_TYPE_MAP } from '@/lib/content-config';
import { getSourceContentDesignation } from '@/lib/source-content/designation';
import {
  AlertCircle,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Grid2X2,
  HelpCircle,
  Image,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  Mails,
  Monitor,
  Newspaper,
  NotebookText,
  Save,
  Sparkles,
  Smartphone,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import InstagramCarousel2Client, {
  type InstagramCarousel2ClientHandle,
  type InstagramCarouselProgress,
  type InstagramCarouselVisualStyle,
} from '@/app/instagram-carousel-2/instagram-carousel-2-client';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollText } from 'lucide-react';
import { XLogoIcon } from '@/components/generator/x-logo-icon';

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
  'social-twitter': XLogoIcon,
  'email-marketing': Mail,
  'email-sequence': Mails,
  newsletter: Newspaper,
  infographic: Image,
  'infographic-copy': Image,
  article: FileText,
  faq: BadgeCheck,
  'video-script': Monitor,
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
  if (type === 'social-instagram') return instagramVariant === 'carousel' ? 'Instagram caption' : 'Instagram post';
  if (type === 'email-marketing') return 'Marketing email';
  if (type === 'social-linkedin') return 'LinkedIn post';
  if (type === 'social-twitter') return 'X post';
  if (type === 'infographic') return 'Infographic';
  return CONTENT_TYPE_MAP[type]?.label ?? type;
}

function parseSourceMetadata(article: any) {
  const meta = article?.metadata;
  if (typeof meta !== 'string') return meta || null;
  try {
    return JSON.parse(meta);
  } catch {
    return null;
  }
}

function getSourceFilename(article: any) {
  const meta = parseSourceMetadata(article);
  const extra = meta?.extraProperties || meta?.raw?.extraProperties || {};
  return extra?.BasContentFilename || extra?.basContentFilename || article?.externalId || null;
}

function formatSourceDate(value: unknown) {
  if (!value) return 'Date unavailable';
  try {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(String(value)));
  } catch {
    return String(value).split('T')[0] || 'Date unavailable';
  }
}

function audienceGuidance(value: string) {
  const guidance: Record<string, string> = {
    'Clients and prospects': 'Audience guidance: write for both existing clients and prospects; balance education, trust-building, and an approachable next step.',
    'Existing clients': 'Audience guidance: write for existing clients; reinforce relationship value, ongoing review, and practical next steps without sounding introductory.',
    'Prospective clients': 'Audience guidance: write for prospective clients; build trust, explain value plainly, and use a low-pressure call to action.',
    Advisors: 'Audience guidance: write for advisors; frame as professional talking points or advisor-use copy, with practical client conversation cues.',
  };
  return guidance[value] || (value ? `Audience guidance: write for ${value}.` : '');
}

function WorkflowStepBody({
  open,
  children,
  className,
  maxHeightClass = 'max-h-[1800px]',
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
  maxHeightClass?: string;
}) {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        'overflow-hidden transition-[max-height,opacity,transform] duration-500 ease-in-out motion-reduce:transition-none',
        open ? cn(maxHeightClass, 'translate-y-0 opacity-100') : 'pointer-events-none max-h-0 -translate-y-2 opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}

function PencilSparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4 shrink-0', className)}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 3H8" />
      <path d="m15.007 5.008 3.987 3.986" />
      <path d="M20 15v4" />
      <path d="M21.174 6.813a2.82 2.82 0 0 0-3.986-3.987L3.842 16.175a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="M22 17h-4" />
      <path d="M4 5v4" />
      <path d="M6 7H2" />
      <path d="M9 2v2" />
    </svg>
  );
}

function GuidanceTooltip({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-cyan-50 hover:text-cyan-700">
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-[240px] text-left leading-5">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

function GenerateHeaderDecoration() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      viewBox="0 0 1600 160"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="generate-header-ribbon" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c96c63" stopOpacity="0" />
          <stop offset="38%" stopColor="#c96c63" stopOpacity="0.28" />
          <stop offset="70%" stopColor="#e3a766" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#e3a766" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="generate-header-line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c96c63" stopOpacity="0" />
          <stop offset="42%" stopColor="#d77c6a" stopOpacity="0.48" />
          <stop offset="86%" stopColor="#f0b26e" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#f0b26e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M -90 132 C 210 76, 430 78, 675 105 C 915 132, 1085 134, 1330 86 C 1465 60, 1575 58, 1690 74 L 1690 124 C 1488 106, 1338 119, 1135 148 C 875 185, 660 145, 430 120 C 220 98, 45 104, -90 150 Z"
        fill="url(#generate-header-ribbon)"
        opacity="0.78"
      />
      <path
        d="M -60 124 C 260 70, 505 75, 770 103 C 1030 130, 1245 110, 1690 64"
        fill="none"
        stroke="url(#generate-header-line)"
        strokeWidth="1.15"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 1030 166 A 138 124 0 0 1 1306 166"
        fill="none"
        stroke="url(#generate-header-line)"
        strokeWidth="1.35"
        opacity="0.72"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 1082 166 A 86 78 0 0 1 1254 166"
        fill="none"
        stroke="url(#generate-header-line)"
        strokeWidth="0.9"
        opacity="0.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<WorkflowStep | null>(3);
  const [usePlainLanguage, setUsePlainLanguage] = useState(true);
  const [includeCallToAction, setIncludeCallToAction] = useState(true);
  const [audience, setAudience] = useState('Clients and prospects');
  const [articlePreviewLayout, setArticlePreviewLayout] = useState<'spotlight' | 'summary' | 'reader'>('spotlight');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isGeneratingSourceTakeaways, setIsGeneratingSourceTakeaways] = useState(false);
  const [kitGenerationGroupId, setKitGenerationGroupId] = useState<string | null>(null);
  const [pendingKitGenerationGroupId, setPendingKitGenerationGroupId] = useState<string | null>(null);

  const selectedSourceId = selectedSourceIds[0] ?? null;
  const { data: selectedSource, mutate: mutateSelectedSource } = useSWR<any>(
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

  const handleGenerateSourceTakeaways = useCallback(async () => {
    if (!selectedSourceId) {
      toast.error('Select an article first');
      return;
    }

    setIsGeneratingSourceTakeaways(true);
    try {
      const response = await fetch('/api/source-content/key-takeaways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [selectedSourceId], overwrite: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Takeaway generation failed');

      const first = Array.isArray(payload.results) ? payload.results[0] : null;
      if (first?.status === 'updated') toast.success('Key takeaways generated');
      else if (first?.status === 'skipped') toast.info(first.reason || 'Source body is too short for takeaways');
      else if (first?.status === 'failed') toast.error(first.reason || 'Takeaway generation failed');
      else toast.info('Takeaway enrichment finished');

      await mutateSelectedSource();
    } catch (error: any) {
      toast.error(error?.message || 'Takeaway generation failed');
    } finally {
      setIsGeneratingSourceTakeaways(false);
    }
  }, [mutateSelectedSource, selectedSourceId]);

  const [mode] = useState<GenerationMode>('kit');

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
  const [approvedKitOutputIds, setApprovedKitOutputIds] = useState<string[]>([]);
  const [isOutputStoryboardOpen, setIsOutputStoryboardOpen] = useState(false);
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [isGeneratingKitInfographic, setIsGeneratingKitInfographic] = useState(false);
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

    void handle.generate({ generationGroupId: pendingKitGenerationGroupId || kitGenerationGroupId || undefined })
      .catch((err) => {
        console.error('KIT carousel generation error:', err);
        toast.error('Carousel image generation failed');
      })
      .finally(() => {
        setPendingKitCarouselGenerate(false);
        setPendingKitGenerationGroupId(null);
      });
  }, [pendingKitCarouselGenerate, pendingKitGenerationGroupId, kitGenerationGroupId, kitTypes, instagramKitVariant, includeInstagramCarouselImages]);

  const toggleKitType = (t: ContentType) => {
    setKitTypes((prev) => {
      if (t === 'infographic') {
        if (prev.includes('infographic')) return prev.filter((x) => x !== 'infographic');
        return Array.from(new Set([...prev, 'infographic-copy', 'infographic']));
      }

      if (t === 'infographic-copy' && prev.includes('infographic')) {
        toast.info('Infographic Copy is required when Infographic is selected.');
        return prev;
      }

      return prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t];
    });
  };

  const handleToggleTypeSingle = (t: ContentType) => {
    // single asset → choose exactly one
    setSelectedContentTypes([t]);
  };

  const getKitTypeStatus = useCallback((type: ContentType): KitOutputStatus => {
    if (type === 'infographic' && isGeneratingKitInfographic) return 'generating';
    if (kitOutputs?.some((output) => output.type === type && output.content?.trim())) return 'complete';
    if (isGeneratingKit && kitTypes.includes(type)) return 'generating';
    return 'idle';
  }, [isGeneratingKit, isGeneratingKitInfographic, kitOutputs, kitTypes]);

  const kitOutputStatuses = kitTypes.reduce<Partial<Record<ContentType, KitOutputStatus>>>((acc, type) => {
    acc[type] = getKitTypeStatus(type);
    return acc;
  }, {});

  const hasInstagramCarousel = kitTypes.includes('social-instagram') &&
    instagramKitVariant === 'carousel' &&
    includeInstagramCarouselImages;
  const isKitCarouselGenerating = pendingKitCarouselGenerate || isGeneratingKitCarouselImages;

  useEffect(() => {
    // Default output tab behavior:
    // - If Instagram multipost images are enabled, start on Carousel.
    // - Otherwise start on the first selected asset so storyboard review has one focused node.
    if (kitTypes.includes('social-instagram') && instagramKitVariant === 'carousel' && includeInstagramCarouselImages) {
      setKitOutputTab('carousel');
    } else if (kitTypes[0]) {
      setKitOutputTab(kitTypes[0]);
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
    setIsOutputStoryboardOpen(true);
    const generationGroupId = `kit-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
    setKitGenerationGroupId(generationGroupId);

    const shouldGenerateCarousel = kitTypes.includes('social-instagram') &&
      instagramKitVariant === 'carousel' &&
      includeInstagramCarouselImages &&
      selectedSourceIds.length === 1;
    const shouldGenerateInlineInstagramImage = kitTypes.includes('social-instagram') &&
      instagramKitVariant === 'single' &&
      includeInstagramSingleImages;
    const shouldGenerateInfographic = kitTypes.includes('infographic');
    const textKitTypes = shouldGenerateInfographic
      ? Array.from(new Set([...kitTypes.filter((type) => type !== 'infographic'), 'infographic-copy']))
      : kitTypes;
    const guidanceContext = [
      additionalContext,
      usePlainLanguage ? 'Use plain language.' : '',
      includeCallToAction ? 'Include a clear call to action.' : '',
      shouldGenerateInfographic ? 'If Infographic is selected, make Infographic Copy concise, structured, and ready to become a single website infographic image.' : '',
      audienceGuidance(audience),
    ].filter(Boolean).join('\n');

    try {
      // Generate KIT text first so non-Instagram outputs show ASAP.
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // type is ignored for kit mode but we send a stable value
          type: textKitTypes[0],
          mode: 'kit',
          selectedTypes: textKitTypes,
          includeInstagramImage: shouldGenerateInlineInstagramImage,
          sourceContentIds: selectedSourceIds,
          customPrompt,
          tone,
          additionalContext: guidanceContext,
          generationGroupId,
        }),
      });

      if (!response.ok) throw new Error('KIT generation failed');
      const payload = await response.json().catch(() => ({}));
      const outputs = Array.isArray(payload?.outputs) ? payload.outputs : null;
      setKitOutputs(outputs);
      setSetupCollapsed(true);
      setIsGeneratingKit(false);

      if (shouldGenerateInfographic) {
        const infographicCopy = outputs?.find((output: { type: ContentType; content: string }) => output.type === 'infographic-copy')?.content || '';
        if (!infographicCopy.trim()) {
          toast.error('Infographic Copy was not generated, so the infographic image could not run.');
        } else {
          setIsGeneratingKitInfographic(true);

          void fetch('/api/generate/infographic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              infographicCopy,
              sourceContentIds: selectedSourceIds,
              guidance: guidanceContext,
              generationGroupId,
            }),
          })
            .then(async (imageResponse) => {
              const imagePayload = await imageResponse.json().catch(() => ({}));
              if (!imageResponse.ok || !imagePayload?.imageUrl) {
                throw new Error(imagePayload?.error || 'Infographic image generation failed');
              }

              setKitOutputs((current) => {
                const base = (current || outputs || []).filter((output: { type: ContentType }) => output.type !== 'infographic');
                return [
                  ...base,
                  {
                    type: 'infographic' as ContentType,
                    label: 'Infographic',
                    content: [
                      'Image generation status: success',
                      `Image URL: ${imagePayload.imageUrl}`,
                      '',
                      'Based on Infographic Copy:',
                      infographicCopy,
                    ].join('\n'),
                  },
                ];
              });
              toast.success('Infographic image generated');
            })
            .catch((err) => {
              console.error('Infographic image generation error:', err);
              setKitOutputs((current) => {
                const base = (current || outputs || []).filter((output: { type: ContentType }) => output.type !== 'infographic');
                return [
                  ...base,
                  {
                    type: 'infographic' as ContentType,
                    label: 'Infographic',
                    content: `Image generation status: failed (${err?.message || 'unknown error'})\n\nBased on Infographic Copy:\n${infographicCopy}`,
                  },
                ];
              });
              toast.error('Infographic image generation failed');
            })
            .finally(() => {
              setIsGeneratingKitInfographic(false);
            });
        }
      }

      // Carousel images run asynchronously so text outputs stay usable while image generation continues.
      if (shouldGenerateCarousel) {
        if (kitCarousel2Ref.current) {
          void kitCarousel2Ref.current.generate({ generationGroupId }).catch((err) => {
            console.error('KIT carousel generation error:', err);
            toast.error('Carousel image generation failed');
          });
        } else {
          setPendingKitGenerationGroupId(generationGroupId);
          setPendingKitCarouselGenerate(true);
        }
      }

      if (kitTypes.includes('social-instagram') && instagramKitVariant === 'carousel' && includeInstagramCarouselImages && selectedSourceIds.length !== 1) {
        toast.info('KIT copy generated. Select exactly one source article to generate carousel images.');
      }

      toast.success(shouldGenerateCarousel || shouldGenerateInfographic ? 'KIT copy generated; image generation is running' : 'KIT generated');
    } catch (err) {
      console.error('KIT generation error:', err);
      toast.error('Failed to generate kit');
    } finally {
      setIsGeneratingKit(false);
    }
  }, [kitTypes, includeInstagramSingleImages, instagramKitVariant, includeInstagramCarouselImages, kitCarousel2Ref, selectedSourceIds, customPrompt, tone, additionalContext, usePlainLanguage, includeCallToAction, audience, setKitCarouselProgress, setIsOutputStoryboardOpen]);

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
      audienceGuidance(audience),
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
  }, [selectedContentTypes, includeInstagramImage, instagramImageMode, selectedSourceIds, customPrompt, tone, additionalContext, usePlainLanguage, includeCallToAction, audience, setGeneratedContent, setGeneratedImages, setImageStatus]);

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

  const handleSaveDraft = async () => {
    if (mode === 'single') {
      if (!generatedContent.trim()) {
        toast.info('Generate an asset before saving a draft.');
        return;
      }

      await handleSave('draft');
      return;
    }

    const outputsToSave = (kitOutputs || []).filter((output) => output.content?.trim());
    if (!outputsToSave.length) {
      toast.info('Generate a campaign before saving drafts.');
      return;
    }

    setIsSavingDraft(true);
    try {
      for (const output of outputsToSave) {
        const outputLabel = output.label || CONTENT_TYPE_MAP[output.type]?.label || 'Campaign output';
        const firstLine = output.content.split('\n').find((line) => line.trim())?.trim() || outputLabel;
        const response = await fetch('/api/generated-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: output.type,
            title: `${outputLabel}: ${firstLine}`.slice(0, 100),
            content: output.content,
            sourceContentIds: selectedSourceIds,
            prompt: customPrompt,
            tone,
            status: 'draft',
            versionNote: 'Campaign kit draft',
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || `Failed to save ${outputLabel}`);
        }
      }

      toast.success(`Saved ${outputsToSave.length} campaign draft${outputsToSave.length === 1 ? '' : 's'}`);
      router.push('/library');
    } catch (err) {
      console.error('Save campaign draft error:', err);
      toast.error('Failed to save campaign drafts');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const hasGeneratedOutput = mode === 'kit'
    ? Boolean(kitOutputs || hasRenderedKitOutputs || pendingKitCarouselGenerate || isGeneratingKitCarouselImages || isGeneratingKitInfographic)
    : Boolean(generatedContent.trim() || Object.keys(generatedImages).length);
  const activeTypes = mode === 'kit' ? kitTypes : selectedContentTypes;
  const selectedArticleTitle = detailContent?.title ? decodeEntitiesLite(detailContent.title) : '';
  const selectedArticleSummary = decodeEntitiesLite(
    String(detailContent?.excerpt || normalizedBodyPreview.split(/\n{2,}/)[0] || '')
  );
  const selectedArticleTags = Array.isArray(detailContent?.tags)
    ? (detailContent.tags as unknown[]).map((tag: unknown) => decodeEntitiesLite(String(tag))).filter(Boolean)
    : [];
  const selectedArticleFilename = getSourceFilename(detailContent);
  const selectedArticlePublishedAt = detailContent?.publishedAt || detailContent?.published_at;
  const selectedArticleContentType = selectedArticleTitle ? decodeEntitiesLite(getSourceContentDesignation(detailContent)) : '';
  const selectedArticleDetailParts = [
    selectedArticleContentType,
    ...selectedArticleTags,
  ].filter(Boolean);
  const visibleOutputTypes = activeTypes.slice(0, 3);
  const extraOutputCount = Math.max(activeTypes.length - visibleOutputTypes.length, 0);
  const hasCampaignContextSettings = kitTypes.includes('social-instagram') && instagramKitVariant === 'carousel';
  const campaignContextSummary = hasCampaignContextSettings
    ? `${kitCarouselSlideCount} slides - ${kitCarouselVisualStyle === 'classic' ? 'Classic look' : 'Bright editorial'}`
    : '';
  const guidanceOptions = [
    usePlainLanguage ? 'Plain language' : null,
    includeCallToAction ? 'Call to action' : null,
    customPrompt.trim() ? 'Custom context' : null,
  ].filter(Boolean) as string[];
  const visibleGuidanceOptions = guidanceOptions.slice(0, 2);
  const extraGuidanceOptionCount = Math.max(guidanceOptions.length - visibleGuidanceOptions.length, 0);
  const guidanceContextSummary = visibleGuidanceOptions.length
    ? `${visibleGuidanceOptions.join(', ')}${extraGuidanceOptionCount ? `, +${extraGuidanceOptionCount} more` : ''}`
    : 'No extra preferences';
  const generateDisabled = mode === 'kit'
    ? isGeneratingKit || isGeneratingKitCarouselImages || isGeneratingKitInfographic || !kitTypes.length || !selectedSourceIds.length
    : isGenerating || !selectedContentTypes.length || !selectedSourceIds.length;
  const isSetupCollapsed = setupCollapsed && hasGeneratedOutput;
  const setupTrayClassName = cn(
    'space-y-6 overflow-hidden transition-[max-height,opacity,transform] duration-500 ease-in-out',
    isSetupCollapsed
      ? 'pointer-events-none max-h-0 -translate-y-6 opacity-0'
      : 'max-h-[3200px] translate-y-0 opacity-100'
  );
  const openWorkflowStep = (step: WorkflowStep) => {
    setSetupCollapsed(false);
    setActiveWorkflowStep(step);
    window.requestAnimationFrame(() => {
      document.getElementById(`generate-step-${step}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };
  const campaignOutputNodes = [
    ...(hasInstagramCarousel ? [{
      id: 'carousel' as const,
      label: 'Instagram Carousel',
      shortLabel: 'Carousel',
      category: 'Visual',
      icon: Instagram,
      status: isKitCarouselGenerating ? 'generating' as KitOutputStatus : kitCarouselProgress?.stage === 'complete' ? 'complete' as KitOutputStatus : 'idle' as KitOutputStatus,
    }] : []),
    ...kitTypes.map((type) => {
      const Icon = iconByContentType[type] || FileText;
      return {
        id: type,
        label: CONTENT_TYPE_MAP[type]?.label ?? type,
        shortLabel: compactOutputLabel(type, instagramKitVariant),
        category: type.startsWith('email') || type === 'newsletter' ? 'Email' : type.includes('social') ? 'Social' : 'Visual',
        icon: Icon,
        status: getKitTypeStatus(type),
      };
    }),
  ];
  const activeCampaignNode = campaignOutputNodes.find((node) => node.id === kitOutputTab) || campaignOutputNodes[0] || null;
  const activeCampaignNodeIndex = activeCampaignNode
    ? Math.max(0, campaignOutputNodes.findIndex((node) => node.id === activeCampaignNode.id))
    : -1;
  const generatedCampaignCount = campaignOutputNodes.filter((node) => node.status === 'complete').length;
  const approvedCampaignCount = campaignOutputNodes.filter((node) => approvedKitOutputIds.includes(String(node.id))).length;
  const needsReviewCount = Math.max(0, generatedCampaignCount - approvedCampaignCount);
  const campaignProgress = campaignOutputNodes.length
    ? Math.round((generatedCampaignCount / campaignOutputNodes.length) * 100)
    : 0;
  const activeCampaignStatus = activeCampaignNode?.status || 'idle';
  const activeCampaignApproved = activeCampaignNode ? approvedKitOutputIds.includes(String(activeCampaignNode.id)) : false;
  const goToCampaignNode = (nodeId: string) => {
    setKitOutputTab(nodeId as ContentType | 'carousel');
  };
  const goToCampaignIndex = (index: number) => {
    const nextNode = campaignOutputNodes[index];
    if (nextNode) goToCampaignNode(String(nextNode.id));
  };
  const approveActiveCampaignNode = () => {
    if (!activeCampaignNode) return;
    setApprovedKitOutputIds((current) => (
      current.includes(String(activeCampaignNode.id)) ? current : [...current, String(activeCampaignNode.id)]
    ));
    if (activeCampaignNodeIndex < campaignOutputNodes.length - 1) {
      goToCampaignIndex(activeCampaignNodeIndex + 1);
    }
  };
  const copyActiveCampaignOutput = async () => {
    if (!activeCampaignNode || activeCampaignNode.id === 'carousel') {
      toast.info('Use the carousel preview controls to copy carousel content.');
      return;
    }

    const output = kitOutputs?.find((item) => item.type === activeCampaignNode.id);
    if (!output?.content?.trim()) {
      toast.info('Generate this asset before copying.');
      return;
    }

    await navigator.clipboard.writeText(output.content);
    toast.success('Asset copied');
  };

  return (
    <div className="flex w-full max-w-none flex-col gap-4 pb-20">
      <div
        className="relative isolate flex h-[132px] overflow-hidden rounded-lg border border-slate-200 px-6 py-5 text-white shadow-sm sm:px-7"
        style={{
          background:
            'linear-gradient(105deg, #10233e 0%, #164568 48%, #7d515d 78%, #c96c63 112%)',
        }}
      >
        <GenerateHeaderDecoration />
        <div className="relative z-10 flex w-full flex-col justify-center gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold leading-tight tracking-normal text-white">Generate Content</h1>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/85">Turn one trusted article into a coordinated marketing campaign.</p>
          </div>
        </div>
      </div>

      {hasGeneratedOutput ? (
        <div className={cn(
          'grid gap-3',
          isSetupCollapsed ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]' : 'justify-items-end'
        )}>
          {isSetupCollapsed ? (
            <>
              <button
                type="button"
                onClick={() => openWorkflowStep(1)}
                className="flex min-h-[96px] min-w-0 items-center gap-4 rounded-lg border border-violet-100 bg-white/95 p-4 text-left shadow-sm transition hover:border-violet-300 hover:bg-violet-50/30"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700">
                  <Sparkles className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-violet-700">Generation Type</span>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold leading-tight text-slate-950">Campaign Kit</h2>
                    <span className="rounded-full border border-violet-200 bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">
                      {activeTypes.length} selected
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-600">Create coordinated assets from one trusted article.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => openWorkflowStep(2)}
                className="flex min-h-[96px] min-w-0 items-center gap-4 rounded-lg border border-cyan-100 bg-white/95 p-4 text-left shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50/30"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-cyan-100 text-cyan-700">
                  <NotebookText className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-cyan-700">Writing guidance</span>
                  <h2 className="mt-1 text-lg font-semibold leading-tight text-slate-950">{toneLabel(tone)}</h2>
                  <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-600">{toneDescription(tone)}</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => openWorkflowStep(3)}
                className="flex min-h-[96px] min-w-0 items-center gap-4 rounded-lg border border-blue-100 bg-white/95 p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/30"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                  <FileText className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Source Selection</span>
                  <h2 className={cn('mt-1 line-clamp-1 text-lg font-semibold leading-tight', selectedArticleTitle ? 'text-slate-950' : 'text-amber-700')}>
                    {selectedArticleTitle || 'Choose a source article'}
                  </h2>
                  {selectedArticleFilename ? (
                    <div className="mt-1 flex max-w-full items-center gap-2 overflow-hidden">
                      <span className="min-w-0 truncate text-xs leading-5 text-slate-500">
                        File: {decodeEntitiesLite(String(selectedArticleFilename))}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-600">Select the trusted article to transform into your campaign.</p>
                  )}
                </div>
              </button>
            </>
          ) : null}
          <div className={cn('flex items-start justify-end', isSetupCollapsed && 'lg:min-w-[190px]')}>
            {isSetupCollapsed ? (
              <button
                type="button"
                className="group flex h-full min-h-[96px] w-full flex-col justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100/70 hover:shadow-md lg:max-w-[210px]"
                onClick={() => setSetupCollapsed(false)}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm transition group-hover:bg-emerald-700">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="mt-2 text-sm font-bold leading-5 text-emerald-900">Change options</span>
                <span className="mt-0.5 text-xs font-medium leading-4 text-emerald-700">Adjust setup and generate again.</span>
              </button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="rounded-md bg-white"
                onClick={() => setSetupCollapsed(true)}
              >
                Hide options
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {mode === 'kit' ? (
        <div className="space-y-6">
          <div className={setupTrayClassName}>
          <div className="space-y-4">
            <div
              id="generate-step-1"
              className={cn(
                'scroll-mt-24 overflow-hidden rounded-lg border bg-card shadow-sm transition-colors',
                activeWorkflowStep === 1 ? 'border-violet-300 bg-violet-50/20' : 'border-violet-100'
              )}
            >
              <div className="grid min-h-[94px] items-center gap-4 border-b border-violet-100 bg-white/95 p-4 lg:grid-cols-[minmax(250px,1.1fr)_minmax(280px,1.3fr)_minmax(220px,0.8fr)_136px]">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700">
                    <Sparkles className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-violet-700">Generation Type</span>
                      {activeWorkflowStep === 1 ? (
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700">Editing</span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold leading-tight text-slate-950">Campaign Kit</h2>
                      <span className="rounded-full border border-violet-200 bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">
                        {activeTypes.length} selected
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-600">Create coordinated assets from one trusted article.</p>
                  </div>
                </div>
                <div className="min-w-0 self-start border-t border-violet-100 pt-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Included outputs</div>
                  <div className="mt-2 flex min-h-9 flex-wrap items-center gap-2 overflow-hidden">
                    {visibleOutputTypes.map((type) => {
                      const Icon = iconByContentType[type] || FileText;
                      return (
                        <span key={type} className="inline-flex max-w-[190px] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{compactOutputLabel(type, instagramKitVariant)}</span>
                        </span>
                      );
                    })}
                    {extraOutputCount ? (
                      <span className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">+ {extraOutputCount} more</span>
                    ) : null}
                  </div>
                </div>
                <div className="min-w-0 self-start border-t border-violet-100 pt-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  {hasCampaignContextSettings ? (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Contextual settings</div>
                      <div className="mt-2 flex min-h-9 items-center gap-3 text-sm font-semibold text-slate-800">
                        <Instagram className="h-4 w-4 shrink-0 text-violet-700" />
                        <span className="truncate">{campaignContextSummary}</span>
                      </div>
                    </>
                  ) : null}
                </div>
                <div className="flex items-center justify-start gap-3 self-center lg:justify-self-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-[104px] justify-center gap-2 rounded-md border-violet-200 bg-violet-50 font-semibold text-violet-700 hover:bg-violet-100 hover:text-violet-800"
                    onClick={() => setActiveWorkflowStep(activeWorkflowStep === 1 ? null : 1)}
                  >
                    <PencilSparklesIcon />
                    {activeWorkflowStep === 1 ? 'Save' : 'Edit'}
                  </Button>
                  <span className="flex h-6 w-6 items-center justify-center" title={activeTypes.length ? 'Campaign kit ready' : 'Select at least one output'}>
                    {activeTypes.length ? (
                      <CheckCircle2 className="h-5 w-5 fill-emerald-600 text-white" />
                    ) : (
                      <AlertCircle className="h-5 w-5 fill-amber-100 text-amber-600" />
                    )}
                  </span>
                </div>
              </div>
              <WorkflowStepBody open={activeWorkflowStep === 1} maxHeightClass="max-h-[1900px]">
                <div className="p-5">
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
                <Card className="mt-6 overflow-hidden rounded-lg border-violet-200 bg-white shadow-sm">
                  <CardContent className="space-y-4 p-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.75fr)_minmax(0,1fr)] lg:items-center">
                      <div className="flex min-w-0 items-center gap-4">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700">
                          <Instagram className="h-6 w-6" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold uppercase tracking-wide text-violet-700">Contextual settings</div>
                          <h3 className="mt-1 text-base font-semibold text-slate-950">Instagram carousel</h3>
                          <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-600">These controls appear only while Instagram carousel is selected.</p>
                        </div>
                      </div>
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
                </div>
              </WorkflowStepBody>
            </div>

            <div
              id="generate-step-2"
              className={cn(
                'scroll-mt-24 overflow-hidden rounded-lg border bg-card shadow-sm transition-colors',
                activeWorkflowStep === 2 ? 'border-cyan-300 bg-cyan-50/20' : 'border-cyan-100'
              )}
            >
              <div className="grid min-h-[94px] items-center gap-4 border-b border-cyan-100 bg-white/95 p-4 lg:grid-cols-[minmax(250px,1.1fr)_minmax(280px,1.3fr)_minmax(220px,0.8fr)_136px]">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-cyan-100 text-cyan-700">
                    <NotebookText className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-cyan-700">Writing guidance</span>
                      {activeWorkflowStep === 2 ? (
                        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs font-bold text-cyan-700">Editing</span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold leading-tight text-slate-950">{toneLabel(tone)}</h2>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-600">{toneDescription(tone)}</p>
                  </div>
                </div>
                <div className="min-w-0 self-start border-t border-cyan-100 pt-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Audience</div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{audience}</p>
                </div>
                <div className="min-w-0 self-start border-t border-cyan-100 pt-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Additional options</div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{guidanceContextSummary}</p>
                </div>
                <div className="flex items-center justify-start gap-3 self-center lg:justify-self-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-[104px] justify-center gap-2 rounded-md border-cyan-200 bg-cyan-50 font-semibold text-cyan-700 hover:bg-cyan-100 hover:text-cyan-800"
                    onClick={() => setActiveWorkflowStep(activeWorkflowStep === 2 ? null : 2)}
                  >
                    <PencilSparklesIcon />
                    {activeWorkflowStep === 2 ? 'Save' : 'Edit'}
                  </Button>
                  <span className="flex h-6 w-6 items-center justify-center" title="Writing guidance ready">
                    <CheckCircle2 className="h-5 w-5 fill-emerald-600 text-white" />
                  </span>
                </div>
              </div>
              <WorkflowStepBody open={activeWorkflowStep === 2} maxHeightClass="max-h-[720px]">
                <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)_minmax(280px,1.15fr)]">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Tone</div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                      {(['professional', 'casual', 'friendly', 'authoritative', 'conversational', 'urgent'] as ToneType[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setTone(option)}
                          className={cn(
                            'relative flex h-[92px] flex-col items-start justify-start rounded-md border bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-cyan-300 hover:bg-cyan-50/50',
                            tone === option ? 'border-cyan-400 bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200' : 'border-slate-200'
                          )}
                        >
                          {tone === option ? (
                            <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-white">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                          <span className="block pr-6">{toneLabel(option)}</span>
                          <span className={cn('mt-1 line-clamp-2 block max-w-[170px] text-xs font-medium leading-5', tone === option ? 'text-cyan-700' : 'text-slate-500')}>
                            {toneDescription(option)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-cyan-100 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Audience</div>
                    </div>
                    <select
                      value={audience}
                      onChange={(event) => setAudience(event.target.value)}
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
                    >
                      <option>Clients and prospects</option>
                      <option>Existing clients</option>
                      <option>Prospective clients</option>
                      <option>Advisors</option>
                    </select>
                  </div>

                  <div className="space-y-3 border-t border-cyan-100 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Additional options</div>
                    </div>
                    <label className="block space-y-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Additional instructions
                        <GuidanceTooltip>Add specific audience notes, key messages, compliance language, or campaign goals for this generation.</GuidanceTooltip>
                      </span>
                      <textarea
                        className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                        placeholder="Add audience, key message, compliance notes, or calls to action..."
                        value={customPrompt}
                        onChange={(event) => setCustomPrompt(event.target.value)}
                      />
                    </label>
                    <div className="grid gap-2">
                      <div className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" className="h-4 w-4 accent-primary" checked={usePlainLanguage} onChange={(event) => setUsePlainLanguage(event.target.checked)} />
                          Use plain language
                        </label>
                        <GuidanceTooltip>Simplifies wording, reduces jargon, and makes the copy easier for clients to scan and understand.</GuidanceTooltip>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" className="h-4 w-4 accent-primary" checked={includeCallToAction} onChange={(event) => setIncludeCallToAction(event.target.checked)} />
                          Include a call to action
                        </label>
                        <GuidanceTooltip>Adds a clear next step, such as scheduling a review, replying, or contacting the advisor.</GuidanceTooltip>
                      </div>
                    </div>
                  </div>
                </div>
              </WorkflowStepBody>

            </div>
          </div>

          <div
            id="generate-step-3"
            className={cn(
              'scroll-mt-24 overflow-hidden rounded-lg border bg-card shadow-sm transition-colors',
              activeWorkflowStep === 3 ? 'border-blue-300 bg-blue-50/20' : 'border-blue-100'
            )}
          >
            <div className="grid min-h-[94px] items-center gap-4 border-b border-blue-100 bg-white/95 p-4 lg:grid-cols-[minmax(250px,1.1fr)_minmax(280px,1.3fr)_minmax(220px,0.8fr)_136px]">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                  <FileText className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Source Selection</span>
                    {activeWorkflowStep === 3 ? (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">Editing</span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 className={cn('line-clamp-1 text-lg font-semibold leading-tight', selectedArticleTitle ? 'text-slate-950' : 'text-amber-700')}>
                      {selectedArticleTitle || 'Choose a source article'}
                    </h2>
                  </div>
                  {selectedArticleFilename ? (
                    <div className="mt-1 flex max-w-full items-center gap-2 overflow-hidden">
                      <span className="min-w-0 truncate text-xs leading-5 text-slate-500">
                        File: {decodeEntitiesLite(String(selectedArticleFilename))}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-600">Select the trusted article to transform into your campaign.</p>
                  )}
                </div>
              </div>
              <div className="min-w-0 self-start border-t border-blue-100 pt-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Summary</div>
                <div className="mt-2 space-y-1">
                  {selectedArticleTitle ? (
                    <p className="line-clamp-2 text-xs leading-5 text-slate-600">
                      {selectedArticleSummary || 'Summary unavailable for this selected article.'}
                    </p>
                  ) : null}
                  </div>
              </div>
              <div className="min-w-0 self-start border-t border-blue-100 pt-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Details</div>
                <div className="mt-2 space-y-1 text-sm font-semibold leading-5 text-slate-800">
                  {selectedArticleTitle ? (
                    <>
                      <div>{selectedArticlePublishedAt ? formatSourceDate(selectedArticlePublishedAt) : 'Date unavailable'}</div>
                      {selectedArticleDetailParts.length ? (
                        <div className="line-clamp-2 pt-1 text-xs font-medium leading-5 text-slate-600">
                          {selectedArticleDetailParts.join(' · ')}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center justify-start gap-3 self-center lg:justify-self-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-[104px] justify-center gap-2 rounded-md border-blue-200 bg-blue-50 font-semibold text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                  onClick={() => setActiveWorkflowStep(activeWorkflowStep === 3 ? null : 3)}
                  >
                    <PencilSparklesIcon />
                    {activeWorkflowStep === 3 ? 'Save' : 'Edit'}
                  </Button>
                  <span className="flex h-6 w-6 items-center justify-center" title={selectedSourceIds.length ? 'Source article selected' : 'Select a source article'}>
                    {selectedSourceIds.length ? (
                      <CheckCircle2 className="h-5 w-5 fill-emerald-600 text-white" />
                    ) : (
                      <AlertCircle className="h-5 w-5 fill-amber-100 text-amber-600" />
                    )}
                  </span>
              </div>
            </div>
            <WorkflowStepBody open={activeWorkflowStep === 3} maxHeightClass="max-h-[1050px]">
              <div className="p-3">
                <div className="grid items-stretch gap-5 xl:h-[720px] xl:max-h-[720px] xl:min-h-0 xl:overflow-hidden xl:grid-cols-[minmax(390px,42%)_minmax(0,58%)] 2xl:grid-cols-[minmax(420px,42%)_minmax(0,58%)]">
                  <div className="min-h-0 xl:h-full">
                    <SourceArticlePicker
                      className="xl:h-full"
                      selectedId={selectedSourceIds[0] ?? null}
                      onSelect={handleSourceSelect}
                      splitView
                    />
                  </div>

                  <div className="flex min-h-0 flex-col gap-2 xl:h-full">
                    <div className="flex justify-end">
                      <div className="inline-grid grid-cols-3 rounded-md border border-slate-200 bg-white p-0.5 shadow-sm">
                        {([
                          ['spotlight', 'Spotlight'],
                          ['summary', 'Summary'],
                          ['reader', 'Reader'],
                        ] as const).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setArticlePreviewLayout(value)}
                            className={cn(
                              'h-8 rounded px-3 text-xs font-semibold transition-colors',
                              articlePreviewLayout === value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <SelectedArticlePreview
                      className="min-h-0 flex-1"
                      selectedSource={selectedSource}
                      detailContent={detailContent}
                      bodyPreview={normalizedBodyPreview}
                      onClear={handleClearSource}
                      onUseArticle={handleUseDetailArticle}
                      onViewDetails={handleOpenSelectedDetails}
                      onGenerateTakeaways={handleGenerateSourceTakeaways}
                      isGeneratingTakeaways={isGeneratingSourceTakeaways}
                      campaignCompact
                      campaignLayout={articlePreviewLayout}
                    />
                  </div>
                </div>
                {selectedSourceIds.length > 1 ? (
                  <div className="mt-3 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                    {selectedSourceIds.length} source articles are selected from Source Content. The first article is shown as the preview anchor, and all selected sources will be included in the generated copy. Carousel image generation still requires exactly one source.
                  </div>
                ) : null}
              </div>
            </WorkflowStepBody>
          </div>

          </div>

          <div className="overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50/20 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-emerald-200 bg-white/95 p-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <BadgeCheck className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Generated Output</div>
                  <h2 className="mt-1 text-xl font-semibold leading-tight text-slate-950">Preview Content</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Review the campaign as a connected set of channel-ready assets.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-sm font-semibold text-slate-800">
                  {generatedCampaignCount} of {campaignOutputNodes.length || 0} generated
                </div>
                <div className="h-2 w-36 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${campaignProgress}%` }} />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-md"
                  onClick={() => setIsOutputStoryboardOpen((value) => !value)}
                >
                  {isOutputStoryboardOpen ? 'Hide output' : 'Show output'}
                  <ChevronRight className={cn('h-4 w-4 transition-transform', isOutputStoryboardOpen && 'rotate-90')} />
                </Button>
                <Button
                  type="button"
                  className="rounded-md"
                  onClick={handleGenerateKit}
                  disabled={generateDisabled}
                >
                  {(isGeneratingKit || isGeneratingKitCarouselImages) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate Campaign
                </Button>
              </div>
            </div>

            <div className={cn(
              'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
              isOutputStoryboardOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            )}>
              <div className="min-h-0 overflow-hidden">
            <div className="space-y-5 p-5">
              <div className="px-1 py-5">
                <div className="flex min-h-[142px] items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-md"
                    disabled={activeCampaignNodeIndex <= 0}
                    onClick={() => goToCampaignIndex(activeCampaignNodeIndex - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="relative flex min-w-0 flex-1 justify-center px-2">
                    <div className="absolute left-10 right-10 top-8 hidden h-px bg-slate-200 lg:block" />
                    <div className="relative z-10 flex w-full flex-wrap items-start justify-center gap-x-8 gap-y-5">
                      {campaignOutputNodes.map((node) => {
                        const Icon = node.icon;
                        const active = activeCampaignNode?.id === node.id;
                        const approved = approvedKitOutputIds.includes(String(node.id));
                        const isGeneratingNode = node.status === 'generating';
                        const isGeneratedNode = node.status === 'complete' || approved;
                        const isInstagramNode = node.id === 'carousel' || node.id === 'social-instagram';
                        return (
                          <button
                            key={node.id}
                            type="button"
                            onClick={() => goToCampaignNode(String(node.id))}
                            className={cn(
                              'group flex w-[112px] flex-col items-center gap-2 rounded-lg px-2 py-1.5 text-center text-slate-700 transition-colors hover:text-blue-800',
                              active && 'text-blue-800'
                            )}
                          >
                            <span className={cn(
                              'relative flex h-14 w-14 items-center justify-center rounded-xl border bg-white shadow-sm transition-all after:pointer-events-none after:absolute after:-inset-9 after:-z-10 after:rounded-full after:opacity-0 after:transition-opacity',
                              active
                                ? 'border-blue-400 bg-blue-50 text-blue-700 shadow-[0_12px_28px_rgba(37,99,235,0.16)] after:bg-[radial-gradient(circle,rgba(59,130,246,0.30)_0%,rgba(59,130,246,0.14)_45%,rgba(59,130,246,0)_74%)] after:opacity-100'
                                : 'border-slate-200 text-slate-600 group-hover:border-blue-200 group-hover:bg-blue-50/60'
                            )}>
                              <Icon className={cn('h-6 w-6', isInstagramNode && 'stroke-[2.4]')} />
                              <span className={cn(
                                'absolute -bottom-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white',
                                isGeneratingNode
                                  ? 'bg-blue-100 text-blue-700'
                                  : isGeneratedNode
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-cyan-100 text-cyan-700'
                              )}>
                                {isGeneratingNode ? (
                                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-600" />
                                ) : isGeneratedNode ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                )}
                              </span>
                            </span>
                            <span className="line-clamp-2 min-h-8 text-xs font-bold leading-4">{node.shortLabel}</span>
                            {active ? (
                              <span className={cn(
                                'inline-flex min-h-5 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold leading-4',
                                isGeneratedNode || isGeneratingNode ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                              )}>
                                {isGeneratingNode ? (
                                  <>
                                    Generating
                                    <span className="inline-flex items-center gap-0.5" aria-hidden>
                                      <span className="h-1 w-1 animate-pulse rounded-full bg-current" />
                                      <span className="h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
                                      <span className="h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
                                    </span>
                                  </>
                                ) : isGeneratedNode ? (
                                  'Reviewing'
                                ) : (
                                  'Pending'
                                )}
                              </span>
                            ) : (
                              <span className="h-5" aria-hidden />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-md"
                    disabled={activeCampaignNodeIndex >= campaignOutputNodes.length - 1}
                    onClick={() => goToCampaignIndex(activeCampaignNodeIndex + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className={cn(
                'grid gap-4 transition-[grid-template-columns] duration-300 ease-in-out',
                isReviewPanelOpen
                  ? 'xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_420px]'
                  : 'xl:grid-cols-[minmax(0,1fr)]'
              )}>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      {activeCampaignNode ? (
                          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
                          <activeCampaignNode.icon className={cn('h-4 w-4', (activeCampaignNode.id === 'carousel' || activeCampaignNode.id === 'social-instagram') && 'stroke-[2.4]')} />
                        </span>
                      ) : null}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-950">{activeCampaignNode?.label || 'Campaign asset'}</h3>
                          <span className={cn(
                            'rounded-md px-2 py-0.5 text-xs font-bold',
                            activeCampaignStatus === 'complete' || activeCampaignApproved
                              ? 'bg-emerald-50 text-emerald-700'
                              : activeCampaignStatus === 'generating'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                          )}>
                            {activeCampaignApproved ? 'Approved' : activeCampaignStatus === 'generating' ? 'Generating' : activeCampaignStatus === 'complete' ? 'Ready' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" size="sm" className="rounded-md border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Preview</Button>
                      <Button type="button" variant="outline" size="sm" className="rounded-md" onClick={copyActiveCampaignOutput}>Copy</Button>
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-md text-slate-400" disabled title="Desktop preview coming soon"><Monitor className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-md text-slate-400" disabled title="Mobile preview coming soon"><Smartphone className="h-4 w-4" /></Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Button type="button" variant="outline" size="sm" className="rounded-md text-slate-400" disabled>Regenerate</Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Feature not implemented yet</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Button type="button" variant="outline" size="sm" className="rounded-md text-slate-400" disabled>
                              <Save className="h-4 w-4" />
                              Save campaign
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Feature not implemented yet</TooltipContent>
                      </Tooltip>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={cn(
                          'h-9 w-9 rounded-md transition-colors',
                          !isReviewPanelOpen && 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800'
                        )}
                        onClick={() => setIsReviewPanelOpen((value) => !value)}
                        title={isReviewPanelOpen ? 'Hide Review & Refine' : 'Show Review & Refine'}
                      >
                        <ChevronRight className={cn('h-4 w-4 transition-transform', isReviewPanelOpen && 'rotate-180')} />
                      </Button>
                    </div>
                  </div>

                  <div className="min-h-[520px] bg-slate-50/70 p-4">
                    {(isGeneratingKit && !hasRenderedKitOutputs) ? (
                      <div className="mb-4 rounded-lg border border-emerald-100 bg-white p-4 shadow-sm">
                        <GeneratingOutputState
                          label="Generating editorial assets"
                          detail="The selected content formats are being drafted and will appear here as soon as the request completes."
                        />
                      </div>
                    ) : null}

                    {selectedSourceIds.length === 1 ? (
                      <div className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
                        <InstagramCarousel2Client
                          ref={kitCarousel2Ref}
                          selectedSourceId={selectedSourceIds[0] || null}
                          hideSourcePicker
                          hideSettingsControls
                          defaultTab="carousel"
                          generateLabel="Generate Images"
                          generationGroupId={kitGenerationGroupId || undefined}
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
                      </div>
                    ) : null}

                    <div className={cn(kitOutputTab === 'carousel' && 'hidden')}>
                      <KitGeneratedOutput
                        selectedTypes={kitTypes}
                        outputs={kitOutputs}
                        activeType={activeCampaignNode?.id === 'carousel' ? kitTypes[0] : (activeCampaignNode?.id as any)}
                        showTabs={false}
                        isGenerating={isGeneratingKit}
                        outputStatuses={kitOutputStatuses}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-slate-200 p-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-fit rounded-md"
                      disabled={activeCampaignNodeIndex <= 0}
                      onClick={() => goToCampaignIndex(activeCampaignNodeIndex - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous asset
                    </Button>
                    <div className="text-sm font-bold text-slate-700">
                      {activeCampaignNodeIndex >= 0 ? activeCampaignNodeIndex + 1 : 0} of {campaignOutputNodes.length}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-fit justify-self-end rounded-md"
                      disabled={activeCampaignNodeIndex >= campaignOutputNodes.length - 1}
                      onClick={() => goToCampaignIndex(activeCampaignNodeIndex + 1)}
                    >
                      Next asset
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className={cn(
                  'overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-300 ease-in-out',
                  isReviewPanelOpen ? 'p-4 opacity-100' : 'hidden'
                )}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-slate-950">Review & refine</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">Asset {activeCampaignNodeIndex + 1 || 0} of {campaignOutputNodes.length}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-md"
                            onClick={() => setIsReviewPanelOpen(false)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                  </div>
                  <div className={cn(
                    'transition-[opacity,transform] duration-300 ease-in-out',
                    isReviewPanelOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-6 opacity-0'
                  )}>
                  <div className="mb-4 grid grid-cols-3 gap-2">
                    <button type="button" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">All {campaignOutputNodes.length}</button>
                    <button type="button" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">Needs review {needsReviewCount}</button>
                    <button type="button" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">Approved {approvedCampaignCount}</button>
                  </div>
                  <div className="mb-4 grid grid-cols-3 gap-1 border-b border-slate-200 text-sm font-semibold">
                    <button type="button" className="border-b-2 border-blue-600 px-2 py-2 text-blue-700">Checks</button>
                    <button type="button" className="px-2 py-2 text-muted-foreground">Comments</button>
                    <button type="button" className="px-2 py-2 text-muted-foreground">Details</button>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Channel fit', detail: `Optimized for ${activeCampaignNode?.shortLabel || 'selected asset'}.`, score: activeCampaignStatus === 'complete' || activeCampaignApproved ? '92' : 'Pending' },
                      { label: 'Copy length', detail: 'Within recommended range.', score: activeCampaignStatus === 'complete' ? 'Good' : 'Waiting' },
                      { label: 'Required disclosures', detail: 'Review required language before publishing.', score: activeCampaignApproved ? 'Done' : 'Review' },
                      { label: 'Campaign consistency', detail: 'Aligned with tone and selected source.', score: activeCampaignStatus === 'generating' ? 'Running' : 'Ready' },
                    ].map((check) => (
                      <div key={check.label} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{check.label}</div>
                          <div className="text-xs text-muted-foreground">{check.detail}</div>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                          {check.score}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-900">
                      Reviewer note
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <textarea
                      className="min-h-[86px] w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                      placeholder="Add internal notes for your team..."
                      maxLength={500}
                    />
                  </div>
                  <Button type="button" variant="outline" className="mt-3 w-full justify-between rounded-md">
                    Compare with source
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-md"
                      onClick={() => {
                        if (!activeCampaignNode) return;
                        setApprovedKitOutputIds((current) => current.filter((id) => id !== String(activeCampaignNode.id)));
                      }}
                    >
                      Request changes
                    </Button>
                    <Button type="button" className="rounded-md bg-emerald-600 hover:bg-emerald-700" onClick={approveActiveCampaignNode}>
                      <Check className="h-4 w-4" />
                      Approve & next
                    </Button>
                  </div>
                  </div>
                </div>
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className={setupTrayClassName}>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <div id="generate-step-1" className="scroll-mt-24 rounded-lg border border-border bg-card p-5 shadow-sm">
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
              <div id="generate-step-2" className="scroll-mt-24 rounded-lg border border-border bg-card p-5 shadow-sm">
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

          <div id="generate-step-3" className="scroll-mt-24 rounded-lg border border-border bg-card p-3 shadow-sm">
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
                onGenerateTakeaways={handleGenerateSourceTakeaways}
                isGeneratingTakeaways={isGeneratingSourceTakeaways}
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
            <button
              type="button"
              onClick={() => openWorkflowStep(1)}
              className="inline-flex items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-slate-100 hover:text-primary"
            >
              <Grid2X2 className="h-4 w-4 text-slate-500" />
              {activeTypes.length} output{activeTypes.length === 1 ? '' : 's'}
              {activeTypes.length ? (
                <CheckCircle2 className="h-4 w-4 fill-emerald-600 text-white" />
              ) : (
                <AlertCircle className="h-4 w-4 fill-amber-100 text-amber-600" />
              )}
            </button>
            <span className="text-slate-300">-</span>
            <button
              type="button"
              onClick={() => openWorkflowStep(2)}
              className="inline-flex items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-slate-100 hover:text-primary"
            >
              <User className="h-4 w-4 text-slate-500" />
              {toneLabel(tone)} tone
              <CheckCircle2 className="h-4 w-4 fill-emerald-600 text-white" />
            </button>
            <span className="text-slate-300">-</span>
            <button
              type="button"
              onClick={() => openWorkflowStep(3)}
              className="inline-flex items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-slate-100 hover:text-primary"
            >
              <FileText className="h-4 w-4 text-slate-500" />
              {selectedSourceIds.length || 0} source selected
              {selectedSourceIds.length ? (
                <CheckCircle2 className="h-4 w-4 fill-emerald-600 text-white" />
              ) : (
                <AlertCircle className="h-4 w-4 fill-amber-100 text-amber-600" />
              )}
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-md bg-white px-6"
              onClick={() => void handleSaveDraft()}
              disabled={isSavingDraft || isGenerating || isGeneratingKit || isGeneratingKitCarouselImages}
            >
              {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSavingDraft ? 'Saving...' : 'Save draft'}
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
        onGenerateTakeaways={handleGenerateSourceTakeaways}
        isGeneratingTakeaways={isGeneratingSourceTakeaways}
      />
    </div>
  );
}
