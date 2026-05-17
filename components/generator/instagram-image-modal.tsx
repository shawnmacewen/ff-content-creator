'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type InstagramImageMode = 'single' | 'carousel';
export type InstagramCarouselGenerationMode = 'master-plate' | 'sequential';

export function InstagramImageModal({
  open,
  onOpenChange,
  mode,
  setMode,
  slideCount,
  setSlideCount,
  generationMode,
  setGenerationMode,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: InstagramImageMode;
  setMode: (m: InstagramImageMode) => void;
  slideCount: number;
  setSlideCount: (n: number) => void;
  generationMode: InstagramCarouselGenerationMode;
  setGenerationMode: (m: InstagramCarouselGenerationMode) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Instagram Images</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold">3. Content Format</div>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={cn(
                  'w-full rounded-2xl border p-4 text-left shadow-sm transition-all hover:shadow-md',
                  mode === 'single' && 'border-violet-500/60 bg-violet-500/5 ring-1 ring-violet-500/30'
                )}
              >
                <div className="text-sm font-semibold">Single Post</div>
                <div className="text-xs text-muted-foreground">Single image with caption</div>
              </button>
              <button
                type="button"
                onClick={() => setMode('carousel')}
                className={cn(
                  'w-full rounded-2xl border p-4 text-left shadow-sm transition-all hover:shadow-md',
                  mode === 'carousel' && 'border-violet-500/60 bg-violet-500/5 ring-1 ring-violet-500/30'
                )}
              >
                <div className="text-sm font-semibold">Carousel Post</div>
                <div className="text-xs text-muted-foreground">Multi-image carousel (up to 6 slides)</div>
              </button>
            </div>

            <div className={cn('mt-4 space-y-3', mode !== 'carousel' && 'opacity-50 pointer-events-none')}>
              <div className="text-sm font-semibold">Carousel Settings</div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Number of Slides</div>
                <div className="text-xs text-muted-foreground">{slideCount} Slides</div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[3, 4, 5, 6].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={slideCount === n ? 'default' : 'outline'}
                    className={cn('rounded-2xl', slideCount === n && 'bg-violet-600 hover:bg-violet-600/90')}
                    onClick={() => setSlideCount(n)}
                  >
                    {n} Slides
                  </Button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">Summarizes key points into multiple visual slides</div>
            </div>

            <div className={cn('mt-4 space-y-2', mode !== 'carousel' && 'opacity-50 pointer-events-none')}>
              <div className="text-sm font-semibold">Generation Mode</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGenerationMode('sequential')}
                  className={cn(
                    'w-full rounded-2xl border p-3 text-left shadow-sm transition-all hover:shadow-md',
                    generationMode === 'sequential' && 'border-violet-500/60 bg-violet-500/5 ring-1 ring-violet-500/30'
                  )}
                >
                  <div className="text-sm font-semibold">Sequential</div>
                  <div className="text-xs text-muted-foreground">Generate slide images one-by-one</div>
                </button>
                <button
                  type="button"
                  onClick={() => setGenerationMode('master-plate')}
                  className={cn(
                    'w-full rounded-2xl border p-3 text-left shadow-sm transition-all hover:shadow-md',
                    generationMode === 'master-plate' && 'border-violet-500/60 bg-violet-500/5 ring-1 ring-violet-500/30'
                  )}
                >
                  <div className="text-sm font-semibold">Master Plate</div>
                  <div className="text-xs text-muted-foreground">One shared plate + slide crops (cohesive)</div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="rounded-2xl bg-violet-600 hover:bg-violet-600/90" onClick={onConfirm}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
