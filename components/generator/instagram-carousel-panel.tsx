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
};

function mockSlides(count: number): CarouselSlide[] {
  const base = [
    { headline: '1\nKey takeaway', summary: 'A crisp, branded summary pulled from the article.' },
    { headline: '2\nWhat changed', summary: 'Highlight the main driver in plain language.' },
    { headline: '3\nWhy it matters', summary: 'Explain implications without hype or promises.' },
    { headline: '4\nWhat to watch', summary: 'List a few signals readers can track.' },
    { headline: '5\nCommon questions', summary: 'Answer likely objections succinctly.' },
    { headline: '6\nBottom line', summary: 'A calm, practical wrap-up + next step.' },
  ];
  return Array.from({ length: count }).map((_, i) => ({
    id: `slide-${i + 1}`,
    headline: base[i]?.headline ?? `${i + 1}`,
    summary: base[i]?.summary ?? 'Slide summary',
  }));
}

function mockCaption(slideCount: number) {
  return `Here are ${slideCount} key takeaways — swipe through.\n\nWhat’s your takeaway? Drop a comment below.\n\n#Investing #Markets #FinancialPlanning`;
}

function SlideCard({
  slide,
  index,
  active,
  onClick,
}: {
  slide: CarouselSlide;
  index: number;
  active?: boolean;
  onClick?: () => void;
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
          ? { backgroundImage: `url(${slide.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
    >
      {/* full-bleed visual composition */}
      <div className={cn(
        'absolute inset-0',
        slide.imageUrl ? 'bg-black/20' : 'bg-gradient-to-br from-violet-600/25 via-fuchsia-600/10 to-slate-950/10'
      )} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.18),transparent_50%)]" />

      <div className="relative flex h-full flex-col p-7 text-left">
        {/* minimal chrome: no admin badges */}
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-medium tracking-wide text-white/70">Slide {index + 1}</div>
          <div className="h-7 w-7 rounded-full bg-white/10 backdrop-blur" aria-hidden />
        </div>

        <div className="mt-auto space-y-3 pb-1">
          <div className="text-3xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-sm">
            {slide.headline}
          </div>
          <div className="max-w-[90%] text-sm leading-relaxed text-white/80 line-clamp-3 drop-shadow-sm">
            {slide.summary}
          </div>
        </div>

        {!slide.imageUrl ? (
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
  caption,
  onCaptionChange,
  onGenerate,
  isGenerating,
  canGenerate = true,
}: {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  slideCount: number;
  onSlideCountChange: (n: number) => void;
  slides?: CarouselSlide[];
  caption?: string;
  onCaptionChange?: (v: string) => void;
  onGenerate?: () => void;
  isGenerating?: boolean;
  canGenerate?: boolean;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const localSlides = React.useMemo(() => mockSlides(slideCount), [slideCount]);
  const effectiveSlides = slides?.length ? slides : localSlides;

  const [localCaption, setLocalCaption] = React.useState(() => mockCaption(slideCount));
  const effectiveCaption = caption ?? localCaption;

  React.useEffect(() => {
    setActiveIndex((i) => Math.min(i, slideCount - 1));
    if (!caption) setLocalCaption(mockCaption(slideCount));
  }, [slideCount, caption]);

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
            Generating carousel images… this may take a moment.
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
          <TabsList className="grid w-full grid-cols-2 rounded-2xl">
            <TabsTrigger value="preview" className="rounded-2xl">Preview</TabsTrigger>
            <TabsTrigger value="caption" className="rounded-2xl">Caption</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Carousel Preview ({slideCount} Slides)</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>↔</span>
                <span>Swipe to preview</span>
              </div>
            </div>

            <div className="relative">
              <div
                className="flex w-full gap-4 overflow-x-auto scroll-smooth px-1 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
                aria-label="Instagram carousel preview"
              >
                {/* left spacer so first slide can center */}
                <div className="w-[12%] shrink-0" aria-hidden />

                {effectiveSlides.map((s, idx) => (
                  <div key={s.id} className="w-[76%] shrink-0 sm:w-[58%] lg:w-[72%]">
                    <SlideCard
                      slide={s}
                      index={idx}
                      active={idx === activeIndex}
                      onClick={() => setActiveIndex(idx)}
                    />
                  </div>
                ))}

                {/* right spacer so last slide can center */}
                <div className="w-[12%] shrink-0" aria-hidden />
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
        </Tabs>
      </CardContent>
    </Card>
  );
}
