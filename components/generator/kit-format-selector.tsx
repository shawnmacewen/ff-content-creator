'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ContentType } from '@/lib/types/content';
import { Button } from '@/components/ui/button';
import {
  Instagram,
  Linkedin,
  Mail,
  FileText,
  Video,
  Newspaper,
} from 'lucide-react';

const KIT_TYPES: Array<{ type: ContentType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { type: 'video-script', label: 'Video Script', icon: Video },
  { type: 'social-linkedin', label: 'LinkedIn Post', icon: Linkedin },
  { type: 'social-instagram', label: 'Instagram Post', icon: Instagram },
  { type: 'email-marketing', label: 'Email', icon: Mail },
  { type: 'newsletter', label: 'Newsletter', icon: Newspaper },
  { type: 'article', label: 'Article', icon: FileText },
];

export function KitFormatSelector({
  selected,
  onToggle,
}: {
  selected: ContentType[];
  onToggle: (t: ContentType) => void;
}) {
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-violet-500/10 via-transparent to-transparent p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-violet-700 dark:text-violet-300">Campaign KIT generates multiple assets from one article</div>
          <div className="text-xs text-muted-foreground">
            Perfect for consistent messaging across your channels. Choose the formats you want to include in your kit.
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {KIT_TYPES.map(({ type, label, icon: Icon }) => {
            const active = selected.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => onToggle(type)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl border bg-background/70 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                  active && 'border-violet-500/60 bg-violet-500/10 ring-1 ring-violet-500/20'
                )}
                aria-label={label}
                title={label}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-violet-600' : 'text-muted-foreground')} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {KIT_TYPES.map(({ type, label }) => {
          const active = selected.includes(type);
          return (
            <Button
              key={type}
              type="button"
              variant={active ? 'default' : 'outline'}
              className={cn('rounded-2xl', active && 'bg-violet-600 hover:bg-violet-600/90')}
              onClick={() => onToggle(type)}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
