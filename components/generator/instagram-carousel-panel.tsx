'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type CarouselSlide = {
  id: string;
  headline: string;
  summary: string;
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
          <div className="h-16 w-full rounded-xl bg-gradient-to-br from-black/5 to-black/0 dark:from-white/10 dark:to-white/0" />
          <div className="mt-2 text-[10px] text-muted-foreground/80">Image placeholder</div>
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
}: {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  slideCount: number;
  onSlideCountChange: (n: number) => void;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const slides = React.useMemo(() => mockSlides(slideCount), [slideCount]);
  const [caption, setCaption] = React.useState(() => mockCaption(slideCount));

  React.useEffect(() => {
    setActiveIndex((i) => Math.min(i, slideCount - 1));
    setCaption(mockCaption(slideCount));
  }, [slideCount]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Caption copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Instagram Carousel</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">Generate branded carousel slides + caption.</div>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground">Off</Label>
            <Switch checked={enabled} onCheckedChange={onEnabledChange} />
            <Label className="text-xs text-muted-foreground">On</Label>
          </div>
        </div>

        <div className={cn('mt-4 space-y-3', !enabled && 'opacity-50 pointer-events-none')}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Slides</div>
              <div className="text-xs text-muted-foreground">Support 3–6 slides</div>
            </div>
            <div className="text-sm font-semibold tabular-nums">{slideCount}</div>
          </div>
          <Slider min={3} max={6} step={1} value={[slideCount]} onValueChange={(v) => onSlideCountChange(v[0] ?? 6)} />
        </div>
      </CardHeader>

      <CardContent className={cn('space-y-4', !enabled && 'opacity-50')}>
        {/* Preview panel */}
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-muted-foreground">Carousel Preview ({slideCount} slides)</div>
            <div className="text-xs text-muted-foreground">Click a slide to select</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {slides.map((s, idx) => (
              <SlideCard key={s.id} slide={s} index={idx} active={idx === activeIndex} onClick={() => setActiveIndex(idx)} />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Active slide: <span className="font-medium text-foreground">{activeIndex + 1}</span>
            </div>
            <div>
              {activeIndex + 1}/{slideCount}
            </div>
          </div>
        </div>

        {/* Caption preview below carousel */}
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-muted-foreground">Caption Preview</div>
            <Button variant="outline" size="sm" className="rounded-2xl gap-2" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </div>
          <textarea
            className="mt-3 min-h-[140px] w-full resize-y rounded-2xl border bg-background p-3 text-sm leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <div className="mt-2 text-[11px] text-muted-foreground">AI-generated content. Review and edit before posting.</div>
        </div>
      </CardContent>
    </Card>
  );
}
