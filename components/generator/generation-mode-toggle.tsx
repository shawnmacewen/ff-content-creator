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
    <div className="w-full max-w-[320px] rounded-md border border-slate-200 bg-white p-0.5 shadow-sm">
      <div className="grid grid-cols-2 gap-0.5">
        <button
          type="button"
          onClick={() => onChange('kit')}
          className={cn(
            'h-10 rounded-md px-4 text-center text-sm font-semibold transition-all',
            mode === 'kit'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          )}
        >
          Campaign Kit
        </button>

        <button
          type="button"
          onClick={() => onChange('single')}
          className={cn(
            'h-10 rounded-md px-4 text-center text-sm font-semibold transition-all',
            mode === 'single'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          )}
        >
          Single Asset
        </button>
      </div>
    </div>
  );
}
