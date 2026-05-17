'use client';

import * as React from 'react';
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
  imageUrl?: string | null;
  cropX?: number | null;
  motifUrl?: string | null;
  placement?: string | null;
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
}: {
  slide: CarouselSlide;
  index: number;
  active?: boolean;
  onClick?: () => void;
  isGenerating?: boolean;
}) {
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
              // Pan across one master plate to create connected slides.
              // Use auto/100% so the plate can pan horizontally; prevent tiling via no-repeat.
              backgroundSize: 'auto 100%',
              backgroundPosition: `${slide.cropX ?? 50}% center`,
              backgroundColor: '#000',
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
            : 'bg-gradient-to-br from-violet-500/14 via-violet-200/18 to-white/70'
        )}
      />
      {/* When an image exists, show it raw (no extra overlays) so we can judge the true output quality. */}
      {slide.imageUrl ? null : null}

      <div className="relative flex h-full flex-col p-7 text-left">
        {/* minimal chrome: no admin badges */}
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-medium tracking-wide text-white/70">Slide {index + 1}</div>
          <div className="h-7 w-7 rounded-full bg-white/10 backdrop-blur" aria-hidden />
        </div>

        {(slide.headline || slide.summary) ? (
          <div className="mt-auto space-y-3 pb-1">
            <div className="text-3xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-sm">
              {slide.headline}
            </div>
            <div className="max-w-[90%] text-sm leading-relaxed text-white/80 line-clamp-3 drop-shadow-sm">
              {slide.summary}
            </div>
          </div>
        ) : (
          <div className="mt-auto pb-1">
            <div className="h-8 w-2/3 rounded-xl bg-white/10" />
            <div className="mt-3 h-4 w-4/5 rounded-xl bg-white/10" />
          </div>
        )}

        {isGenerating && !slide.imageUrl ? (
          <div className="absolute inset-0">
            <div className="absolute inset-0 animate-pulse bg-white/5" />
            <div className="absolute bottom-8 left-7 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 backdrop-blur">
              Generating…
            </div>
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

        <div className={cn('mt-4 space-y-2', !enabled && 'opacity-50 pointer-events-none')}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Slides</div>
            </div>
            <div className="text-sm font-semibold tabular-nums">{slideCount}</div>
          </div>
        </div>
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
            <div className="rounded-2xl border bg-muted/30 p-4 max-h-[520px] overflow-hidden">
              <div className="relative">
                <div
                  className="flex w-full gap-4 overflow-x-auto scroll-smooth px-1 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
                  aria-label="Instagram carousel preview"
                >
                  <div className="w-[12%] shrink-0" aria-hidden />

                  {effectiveSlides.map((s, idx) => (
                    <div
                      key={s.id}
                      className="w-[68%] shrink-0 sm:w-[46%] lg:w-[52%] max-w-[360px]"
                    >
                      <SlideCard
                        slide={s}
                        index={idx}
                        active={idx === activeIndex}
                        onClick={() => setActiveIndex(idx)}
                        isGenerating={isGenerating}
                      />
                    </div>
                  ))}

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
