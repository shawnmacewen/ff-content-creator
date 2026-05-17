'use client';

import * as React from 'react';
import { CAROUSEL_TEMPLATES } from '@/lib/generator/carousel-templates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, ChevronLeft, ChevronRight, Instagram } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type CarouselSlide = {
  id: string;
  headline: string;
  summary: string;
  // Outro-specific
  bullets?: string[] | null;
  ctaLine?: string | null;
  // Standard variant metadata
  visualType?: 'diagram' | 'chart' | 'photo' | 'icon' | 'texture' | null;

  imageUrl?: string | null;
  cropX?: number | null;
  motifUrl?: string | null;
  placement?: string | null;
  template?: 'intro' | 'standard' | 'outro' | null;
  promptUsed?: string | null;
};

function emptySlides(count: number): CarouselSlide[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `slide-${i + 1}`,
    headline: '',
    summary: '',
    imageUrl: null,
  }));
}

function SlideCard({
  slide,
  index,
  active,
  onClick,
  isGenerating,
  styleVariant = 'purple-gold',
}: {
  slide: CarouselSlide;
  index: number;
  active?: boolean;
  onClick?: () => void;
  isGenerating?: boolean;
  styleVariant?: 'purple-gold' | 'frost';
}) {
  const template = (slide.template || 'standard') as 'intro' | 'standard' | 'outro';
  const templateSpec = CAROUSEL_TEMPLATES[template] || CAROUSEL_TEMPLATES.standard;
  const ui = templateSpec.uiHint;

  const textPlacement = ui.textPlacement || (template === 'outro' ? 'top-left' : 'bottom-left');
  const padClass = template === 'intro' ? 'p-8' : template === 'outro' ? 'p-8' : 'p-7';

  // Standard slides now use lighter backgrounds + dark text (more like Frost),
  // regardless of style variant.
  const useDarkText = template === 'standard' || styleVariant === 'frost';

  const headlineSizeClass = template === 'intro' ? 'text-[34px]' : template === 'outro' ? 'text-[30px]' : 'text-3xl';
  const summarySizeClass = template === 'intro' ? 'text-[15px]' : 'text-sm';
  const headlineClampClass = ui.headlineMaxLines === 2 ? 'line-clamp-2' : ui.headlineMaxLines === 3 ? 'line-clamp-3' : '';
  const summaryClampClass = ui.summaryMaxLines === 2 ? 'line-clamp-2' : ui.summaryMaxLines === 3 ? 'line-clamp-3' : 'line-clamp-3';

  const isTopText = textPlacement.startsWith('top');

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden rounded-[28px] transition-all',
        'focus:outline-none focus:ring-2 focus:ring-violet-500/40',
        active ? 'ring-2 ring-violet-500/50' : 'hover:brightness-[1.02]'
      )}
      style={
        slide.imageUrl
          ? {
              backgroundImage: `url(${slide.imageUrl})`,
              backgroundRepeat: 'no-repeat',
              // Fill the tile without letterboxing; keep horizontal panning via backgroundPosition.
              backgroundSize: 'cover',
              backgroundPosition: `${slide.cropX ?? 50}% center`,
            }
          : undefined
      }
    >
      {/* full-bleed visual composition */}
      <div
        className={cn(
          'absolute inset-0',
          slide.imageUrl
            ? 'bg-transparent'
            : template === 'standard'
              ? 'bg-gradient-to-br from-white via-white/80 to-violet-500/8'
              : 'bg-gradient-to-br from-violet-500/14 via-violet-200/18 to-white/70'
        )}
      />
      {/* When an image exists, show it raw (no extra overlays) so we can judge the true output quality. */}
      {slide.imageUrl ? null : null}

      <div className={cn('relative flex h-full flex-col text-left', padClass, isTopText ? 'justify-start' : 'justify-end')}>
        {/* minimal chrome: no admin badges */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-7" aria-hidden />
          <div className="h-7 w-7 rounded-full bg-white/10 backdrop-blur" aria-hidden />
        </div>

        {/* Hide text until the image has loaded; while generating, show a centered loader instead. */}
        {!slide.imageUrl ? null : (slide.headline || slide.summary) ? (
          <div className={cn(isTopText ? 'mt-4' : 'mt-auto', 'space-y-3 pb-1')}>
            <div
              className={cn(
                headlineSizeClass,
                'font-semibold leading-[1.05] tracking-tight drop-shadow-sm',
                headlineClampClass,
                useDarkText ? 'text-slate-950' : 'text-white',
                ui.headlineWeight === 'bold' && 'font-bold'
              )}
            >
              {slide.headline}
            </div>

            {template === 'outro' && Array.isArray(slide.bullets) && slide.bullets.length ? (
              <ul className={cn('space-y-1.5 text-sm', useDarkText ? 'text-slate-800' : 'text-white/85')}>
                {slide.bullets.slice(0, 5).map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span className={cn('mt-[6px] h-1.5 w-1.5 rounded-full shrink-0', useDarkText ? 'bg-slate-500/70' : 'bg-white/70')} />
                    <span className="leading-snug">{b}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div
                className={cn(
                  'max-w-[90%] leading-relaxed drop-shadow-sm',
                  summarySizeClass,
                  summaryClampClass,
                  useDarkText ? 'text-slate-800' : 'text-white/80'
                )}
              >
                {slide.summary}
              </div>
            )}

            {template === 'outro' && slide.ctaLine ? (
              <div className={cn('pt-2 text-xs font-semibold', useDarkText ? 'text-slate-700' : 'text-white/80')}>
                {slide.ctaLine}
              </div>
            ) : null}
          </div>
        ) : null}

        {isGenerating && !slide.imageUrl ? (
          <div className="absolute inset-0 grid place-items-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full animate-bounce [animation-delay:-0.2s]', useDarkText ? 'bg-slate-500/70' : 'bg-white/70')} />
                <span className={cn('h-2.5 w-2.5 rounded-full animate-bounce [animation-delay:-0.1s]', useDarkText ? 'bg-slate-500/70' : 'bg-white/70')} />
                <span className={cn('h-2.5 w-2.5 rounded-full animate-bounce', useDarkText ? 'bg-slate-500/70' : 'bg-white/70')} />
              </div>
              <div className={cn('text-xs font-medium', useDarkText ? 'text-slate-600' : 'text-white/75')}>Generating</div>
            </div>
          </div>
        ) : !slide.imageUrl ? (
          // Not generating yet: subtle skeletons
          <div className={cn(isTopText ? 'mt-4' : 'mt-auto', 'pb-1')}>
            <div className={cn('h-8 w-2/3 rounded-xl', useDarkText ? 'bg-black/10' : 'bg-white/10')} />
            <div className={cn('mt-3 h-4 w-4/5 rounded-xl', useDarkText ? 'bg-black/10' : 'bg-white/10')} />
          </div>
        ) : null}
      </div>
    </button>
  );
}

export function InstagramCarouselPanel({
  enabled,
  onEnabledChange,
  slideCount,
  onSlideCountChange,
  slides,
  theme,
  caption,
  onCaptionChange,
  onGenerate,
  onSample,
  progress,
  isGenerating,
  canGenerate = true,
  promptLog,
  lastPrompt,
  styleVariant = 'purple-gold',
  onStyleVariantChange,
}: {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  slideCount: number;
  onSlideCountChange: (n: number) => void;
  slides?: CarouselSlide[];
  theme?: any;
  caption?: string;
  onCaptionChange?: (v: string) => void;
  onGenerate?: () => void;
  onSample?: () => void;
  progress?: { total: number; done: number; activeSlide: number } | null;
  isGenerating?: boolean;
  canGenerate?: boolean;
  promptLog?: string;
  lastPrompt?: string;
  styleVariant?: 'purple-gold' | 'frost';
  onStyleVariantChange?: (v: 'purple-gold' | 'frost') => void;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const localSlides = React.useMemo(() => emptySlides(slideCount), [slideCount]);
  const effectiveSlides = slides?.length ? slides : localSlides;

  const [localCaption, setLocalCaption] = React.useState('');
  const effectiveCaption = caption ?? localCaption;

  React.useEffect(() => {
    setActiveIndex((i) => Math.min(i, slideCount - 1));
  }, [slideCount]);

  const canPrev = activeIndex > 0;
  const canNext = activeIndex < slideCount - 1;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(effectiveCaption);
      toast.success('Caption copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const handleCopyPrompts = async () => {
    try {
      await navigator.clipboard.writeText(promptLog || lastPrompt || '');
      toast.success('Prompts copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const setCaption = (v: string) => {
    onCaptionChange?.(v);
    if (!onCaptionChange) setLocalCaption(v);
  };

  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Instagram className="h-4 w-4 text-violet-600" />
            <CardTitle className="text-base">Preview Your Instagram Post</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {onSample ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-2xl"
                onClick={onSample}
                disabled={!!isGenerating}
              >
                Sample Generation
              </Button>
            ) : null}
            {onGenerate ? (
              <Button
                size="sm"
                className="rounded-2xl bg-violet-600 hover:bg-violet-600/90"
                onClick={onGenerate}
                disabled={!!isGenerating || !canGenerate}
              >
                <span className={cn('inline-flex items-center gap-2', isGenerating && 'opacity-90')}>
                  <span className={cn('h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white', isGenerating ? 'animate-spin' : 'hidden')} />
                  {isGenerating ? 'Generating…' : 'Generate Images'}
                </span>
              </Button>
            ) : null}
            <Label className="text-xs text-muted-foreground">Carousel</Label>
            <Switch checked={enabled} onCheckedChange={onEnabledChange} />
          </div>
        </div>

        {/* Style selector: placed directly under Generate Images button row */}
        <div className={cn('mt-3 flex flex-wrap items-center gap-2', !enabled && 'opacity-50 pointer-events-none')}>
          <div className="text-xs font-medium text-muted-foreground">Style</div>
          <Button
            type="button"
            size="sm"
            variant={styleVariant === 'purple-gold' ? 'default' : 'outline'}
            className={cn('rounded-2xl', styleVariant === 'purple-gold' && 'bg-violet-600 hover:bg-violet-600/90')}
            onClick={() => onStyleVariantChange?.('purple-gold')}
            disabled={!!isGenerating || !onStyleVariantChange}
          >
            Purple + Gold
          </Button>
          <Button
            type="button"
            size="sm"
            variant={styleVariant === 'frost' ? 'default' : 'outline'}
            className={cn('rounded-2xl', styleVariant === 'frost' && 'bg-slate-900 hover:bg-slate-900/90')}
            onClick={() => onStyleVariantChange?.('frost')}
            disabled={!!isGenerating || !onStyleVariantChange}
          >
            Frost
          </Button>
        </div>

        {isGenerating ? (
          <div className="mt-3 text-xs text-muted-foreground">
            {progress ? (
              <span>
                Generating slide {Math.min(progress.activeSlide + 1, progress.total)} of {progress.total}… ({progress.done}/{progress.total} complete)
              </span>
            ) : (
              <span>Generating carousel images… this may take a moment.</span>
            )}
          </div>
        ) : null}

      </CardHeader>

      <CardContent className={cn('space-y-4', !enabled && 'opacity-50')}>
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl">
            <TabsTrigger value="preview" className="rounded-2xl">Preview</TabsTrigger>
            <TabsTrigger value="caption" className="rounded-2xl">Caption</TabsTrigger>
            <TabsTrigger value="prompts" className="rounded-2xl">Prompts</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Carousel Preview ({slideCount} Slides)</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>↔</span>
                <span>Swipe to preview</span>
              </div>
            </div>

            {/* Instagram-like stage */}
            <div className="rounded-2xl border bg-muted/30 p-4 max-h-[520px] overflow-x-hidden overflow-y-visible">
              <div className="relative">
                <div
                  className="flex w-full gap-4 overflow-x-auto scroll-smooth px-1 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
                  aria-label="Instagram carousel preview"
                >
                  <div className="w-[12%] shrink-0" aria-hidden />

                  {effectiveSlides.map((s, idx) => {
                    const template = (s.template || (idx === 0 ? 'intro' : idx === slideCount - 1 ? 'outro' : 'standard')) as
                      | 'intro'
                      | 'standard'
                      | 'outro';

                    return (
                      <div
                        key={s.id}
                        className="w-[68%] shrink-0 sm:w-[46%] lg:w-[52%] max-w-[360px]"
                      >
                        <div className="space-y-2">
                          <SlideCard
                            slide={s}
                            index={idx}
                            active={idx === activeIndex}
                            onClick={() => setActiveIndex(idx)}
                            isGenerating={isGenerating}
                            styleVariant={styleVariant}
                          />
                          <div className="px-1 text-[11px] font-medium tracking-wide text-muted-foreground">
                            Slide {idx + 1} - {template}
                            {template === 'standard' && (s as any).visualType ? ` (${String((s as any).visualType)})` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="w-[12%] shrink-0" aria-hidden />
                </div>

                {/* subtle edge fade */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-muted/80 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-muted/80 to-transparent" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="rounded-2xl" disabled={!canPrev} onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-2xl" disabled={!canNext} onClick={() => setActiveIndex((i) => Math.min(slideCount - 1, i + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1">
                {Array.from({ length: slideCount }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full bg-muted-foreground/30',
                      i === activeIndex && 'w-5 bg-violet-600/80'
                    )}
                  />
                ))}
              </div>

              <div className="text-xs text-muted-foreground tabular-nums">
                {activeIndex + 1}/{slideCount}
              </div>
            </div>


          </TabsContent>

          <TabsContent value="caption" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Generated Caption</div>
              <Button variant="outline" size="sm" className="rounded-2xl gap-2" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
            <textarea
              className="min-h-[220px] w-full resize-y rounded-2xl border bg-background p-4 text-sm leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              value={effectiveCaption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <div className="text-[11px] text-muted-foreground">AI-generated content. Review and edit before posting.</div>
          </TabsContent>

          <TabsContent value="prompts" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Image Generation Prompts</div>
              <Button variant="outline" size="sm" className="rounded-2xl gap-2" onClick={handleCopyPrompts}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground">
              This is a client-side log of prompts returned by the slide endpoint during the most recent carousel run.
            </div>
            <textarea
              readOnly
              className="min-h-[220px] w-full resize-y rounded-2xl border bg-background p-4 text-xs leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              value={(promptLog || lastPrompt || '').trim()}
              placeholder="Run a carousel generation to populate prompt logs…"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
