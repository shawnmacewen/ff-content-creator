'use client';

import * as React from 'react';
import type { ContentType } from '@/lib/types/content';
import { getContentTypesByCategory } from '@/lib/content-config';
import { cn } from '@/lib/utils';
import {
  Check,
  Linkedin,
  Instagram,
  Mail,
  Mails,
  Newspaper,
  FileText,
  BarChart3,
  HelpCircle,
  Video,
} from 'lucide-react';
import { XLogoIcon } from '@/components/generator/x-logo-icon';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  x: XLogoIcon,
  linkedin: Linkedin,
  instagram: Instagram,
  mail: Mail,
  mails: Mails,
  newspaper: Newspaper,
  'file-text': FileText,
  'bar-chart': BarChart3,
  'help-circle': HelpCircle,
  video: Video,
};

const categoryLabels: Record<string, string> = {
  social: 'Social Media',
  email: 'Email & Newsletter',
  'long-form': 'Long-Form Content',
};

export function KitContentTypeSelector({
  selected,
  onToggle,
  instagramVariant,
  setInstagramVariant,
  includeInstagramSingleImages,
  includeInstagramCarouselImages,
  onToggleInstagramSingleImages,
  onToggleInstagramCarouselImages,
}: {
  selected: ContentType[];
  onToggle: (t: ContentType) => void;

  instagramVariant: 'single' | 'carousel' | null;
  setInstagramVariant: (v: 'single' | 'carousel') => void;

  includeInstagramSingleImages: boolean;
  includeInstagramCarouselImages: boolean;
  onToggleInstagramSingleImages: () => void;
  onToggleInstagramCarouselImages: () => void;
}) {
  const categories = ['social', 'email', 'long-form'] as const;

  return (
    <div>
      <div className="grid gap-6 xl:grid-cols-3">
      {categories.map((category) => {
        const types = getContentTypesByCategory(category);
        return (
          <div key={category} className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{categoryLabels[category]}</div>
            <div className="grid gap-2">
              {types.map((ct) => {
                const Icon = iconMap[ct.icon] || FileText;
                const isSelected = selected.includes(ct.id);

                // Social ordering preference: show LinkedIn before X (next row after Instagram chips)
                if (category === 'social' && (ct.id === 'social-twitter' || ct.id === 'social-linkedin')) {
                  // handled in a second pass below
                  return null;
                }

                // Replace default Instagram chip with two chips: multi-post first, then single-post
                if (ct.id === 'social-instagram') {
                  const singleSelected = isSelected && instagramVariant === 'single';
                  const carouselSelected = isSelected && instagramVariant === 'carousel';

                  return (
                    <div key={ct.id} className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setInstagramVariant('carousel');
                          if (carouselSelected || !isSelected) onToggle('social-instagram');
                        }}
                        className={cn(
                          'flex min-h-10 w-full items-center gap-3 rounded-md border bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50/60',
                          carouselSelected && 'border-violet-400 bg-violet-50 ring-1 ring-violet-200'
                        )}
                      >
                        <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', carouselSelected ? 'border-violet-500 bg-violet-600 text-white' : 'border-slate-300 bg-white text-transparent')}>
                          <Check className="h-3 w-3" />
                        </span>
                        <span
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-md',
                            carouselSelected ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'
                          )}
                        >
                          <Instagram className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">Instagram carousel</span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleInstagramCarouselImages();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onToggleInstagramCarouselImages();
                            }
                          }}
                          className={cn(
                            'ml-auto select-none rounded-md border px-2 py-0.5 text-[11px] transition-colors',
                            includeInstagramCarouselImages
                              ? 'border-violet-300 bg-violet-100 text-violet-700'
                              : 'border-border text-muted-foreground hover:bg-muted'
                          )}
                        >
                          {includeInstagramCarouselImages ? 'Images on' : 'Images off'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setInstagramVariant('single');
                          if (singleSelected || !isSelected) onToggle('social-instagram');
                        }}
                        className={cn(
                          'flex min-h-10 w-full items-center gap-3 rounded-md border bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50/60',
                          singleSelected && 'border-violet-400 bg-violet-50 ring-1 ring-violet-200'
                        )}
                      >
                        <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', singleSelected ? 'border-violet-500 bg-violet-600 text-white' : 'border-slate-300 bg-white text-transparent')}>
                          <Check className="h-3 w-3" />
                        </span>
                        <span
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-md',
                            singleSelected ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'
                          )}
                        >
                          <Instagram className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">Instagram single post</span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleInstagramSingleImages();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onToggleInstagramSingleImages();
                            }
                          }}
                          className={cn(
                            'ml-auto select-none rounded-md border px-2 py-0.5 text-[11px] transition-colors',
                            includeInstagramSingleImages
                              ? 'border-violet-300 bg-violet-100 text-violet-700'
                              : 'border-border text-muted-foreground hover:bg-muted'
                          )}
                        >
                          {includeInstagramSingleImages ? 'Images on' : 'Images off'}
                        </span>
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => onToggle(ct.id)}
                    className={cn(
                      'flex min-h-10 w-full items-center gap-3 rounded-md border bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50/60',
                      isSelected && 'border-violet-400 bg-violet-50 ring-1 ring-violet-200'
                    )}
                  >
                    <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', isSelected ? 'border-violet-500 bg-violet-600 text-white' : 'border-slate-300 bg-white text-transparent')}>
                      <Check className="h-3 w-3" />
                    </span>
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-md',
                        isSelected ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{ct.label}</span>
                    {ct.id === 'infographic' ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        New
                      </span>
                    ) : null}
                    {ct.id === 'infographic-copy' && selected.includes('infographic') ? (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        Required
                      </span>
                    ) : null}
                  </button>
                );
              })}

              {category === 'social' ? (
                <div className="grid grid-cols-1 gap-2">
                  {['social-linkedin', 'social-twitter'].map((id) => {
                    const ct = types.find((t) => t.id === id);
                    if (!ct) return null;
                    const Icon = iconMap[ct.icon] || FileText;
                    const isSelected = selected.includes(ct.id);
                    return (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => onToggle(ct.id)}
                        className={cn(
                          'flex min-h-10 w-full items-center gap-3 rounded-md border bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50/60',
                          isSelected && 'border-violet-400 bg-violet-50 ring-1 ring-violet-200'
                        )}
                      >
                        <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', isSelected ? 'border-violet-500 bg-violet-600 text-white' : 'border-slate-300 bg-white text-transparent')}>
                          <Check className="h-3 w-3" />
                        </span>
                        <span
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-md',
                            isSelected ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{ct.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
