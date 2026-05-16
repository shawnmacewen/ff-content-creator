'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export type InstagramToneUI = 'professional' | 'educational' | 'fun';
export type InstagramFormat = 'single' | 'carousel';

export type CarouselSlide = {
  id: string;
  headline: string;
  summary: string;
};

export function SlideMockupCard({
  index,
  slide,
  active,
  onClick,
}: {
  index: number;
  slide: CarouselSlide;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative aspect-[4/5] w-full overflow-hidden rounded-2xl border bg-white/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-white/5',
        active && 'ring-2 ring-violet-500/70'
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent" />
      <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-gradient-to-br from-violet-500/10 via-transparent to-violet-500/10" />

      <div className="relative flex h-full flex-col p-4 text-left">
        <div className="flex items-center justify-between">
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/90 text-xs font-semibold text-white">
            {index + 1}
          </div>
          <div className="h-7 w-7 rounded-full bg-black/5 dark:bg-white/10" aria-hidden />
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-sm font-semibold leading-snug tracking-tight text-foreground">
            {slide.headline}
          </div>
          <div className="text-xs leading-relaxed text-muted-foreground line-clamp-5">
            {slide.summary}
          </div>
        </div>

        <div className="mt-auto">
          <div className="h-20 w-full rounded-xl bg-gradient-to-br from-black/5 to-black/0 dark:from-white/10 dark:to-white/0" />
          <div className="mt-2 text-[10px] text-muted-foreground/80">Image placeholder</div>
        </div>
      </div>
    </button>
  );
}

export function InstagramCarouselPreview({
  slides,
  activeIndex,
  setActiveIndex,
  caption,
  setCaption,
}: {
  slides: CarouselSlide[];
  activeIndex: number;
  setActiveIndex: (idx: number) => void;
  caption: string;
  setCaption: (v: string) => void;
}) {
  const canPrev = activeIndex > 0;
  const canNext = activeIndex < slides.length - 1;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Caption copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <div className="text-sm font-semibold tracking-tight">Preview Your Instagram Post</div>
          <div className="text-xs text-muted-foreground">Live carousel + caption preview</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled={!canPrev} onClick={() => setActiveIndex(activeIndex - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" disabled={!canNext} onClick={() => setActiveIndex(activeIndex + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-5">
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="caption">Caption</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground">Carousel Preview ({slides.length} slides)</div>
              <div className="text-xs text-muted-foreground">Click a slide to edit</div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {slides.map((s, idx) => (
                <SlideMockupCard
                  key={s.id}
                  index={idx}
                  slide={s}
                  active={idx === activeIndex}
                  onClick={() => setActiveIndex(idx)}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div>
                Active slide: <span className="font-medium text-foreground">{activeIndex + 1}</span>
              </div>
              <div>
                {activeIndex + 1}/{slides.length}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="caption" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground">Generated Caption</div>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
            <textarea
              className="min-h-[220px] w-full resize-y rounded-2xl border bg-background p-4 text-sm leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <div className="text-[11px] text-muted-foreground">
              AI-generated content. Please review for compliance before posting.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
