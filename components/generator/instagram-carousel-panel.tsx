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
        'group relative aspect-[4/5] w-full overflow-hidden rounded-2xl border bg-white/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-white/5',
        active && 'ring-2 ring-violet-500/60'
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/12 via-fuchsia-500/6 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/70 to-transparent dark:from-black/30" />

      <div className="relative flex h-full flex-col p-4 text-left">
        <div className="flex items-center justify-between">
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white">
            {index + 1}
          </div>
          <div className="h-7 w-7 rounded-full bg-black/5 dark:bg-white/10" aria-hidden />
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-sm font-semibold leading-snug tracking-tight text-foreground whitespace-pre-line">
            {slide.headline}
          </div>
          <div className="text-xs leading-relaxed text-muted-foreground line-clamp-5">{slide.summary}</div>
        </div>

        <div className="mt-auto">
          <div className="h-16 w-full overflow-hidden rounded-xl bg-gradient-to-br from-black/5 to-black/0 dark:from-white/10 dark:to-white/0">
            {slide.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slide.imageUrl} alt="" className="h-full w-full object-cover opacity-90" />
            ) : null}
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground/80">
            {slide.imageUrl ? 'Generated image' : 'Image placeholder'}
          </div>
        </div>
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
                {isGenerating ? 'Generating…' : 'Generate Images'}
              </Button>
            ) : null}
            <Label className="text-xs text-muted-foreground">Carousel</Label>
            <Switch checked={enabled} onCheckedChange={onEnabledChange} />
          </div>
        </div>

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

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {effectiveSlides.map((s, idx) => (
                <SlideCard key={s.id} slide={s} index={idx} active={idx === activeIndex} onClick={() => setActiveIndex(idx)} />
              ))}
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
