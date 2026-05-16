'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type GenerationMode = 'single' | 'kit';

export function GenerationModeToggle({
  mode,
  onChange,
}: {
  mode: GenerationMode;
  onChange: (m: GenerationMode) => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-3 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange('single')}
          className={cn(
            'rounded-2xl border px-4 py-3 text-left transition-all',
            mode === 'single'
              ? 'border-violet-500/50 bg-violet-500/5 shadow-sm'
              : 'bg-background/60 hover:bg-background'
          )}
        >
          <div className="text-sm font-semibold">Single Asset</div>
          <div className="text-xs text-muted-foreground">Generate one piece of content</div>
        </button>

        <button
          type="button"
          onClick={() => onChange('kit')}
          className={cn(
            'rounded-2xl border px-4 py-3 text-left transition-all',
            mode === 'kit'
              ? 'border-violet-500/50 bg-violet-500/5 shadow-sm'
              : 'bg-background/60 hover:bg-background'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">KIT (Campaign)</div>
            <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white">NEW</span>
          </div>
          <div className="text-xs text-muted-foreground">Coordinated multi-format package</div>
        </button>
      </div>
    </div>
  );
}
