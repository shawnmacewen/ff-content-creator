'use client';

import * as React from 'react';
import type { ContentType } from '@/lib/types/content';
import { getContentTypesByCategory } from '@/lib/content-config';
import { cn } from '@/lib/utils';
import {
  Twitter,
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

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  twitter: Twitter,
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
    <div className="space-y-5">
      {categories.map((category) => {
        const types = getContentTypesByCategory(category);
        return (
          <div key={category} className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">{categoryLabels[category]}</div>
            {category === 'social' ? (
              <p className="text-xs text-muted-foreground">
                Image generation is available for Instagram single posts and multi-post carousels. LinkedIn and X generate copy-only posts for now.
              </p>
            ) : null}
            <div className={cn(
              category === 'social' ? 'grid gap-2' : 'flex flex-wrap gap-2'
            )}>
              {types.map((ct) => {
                const Icon = iconMap[ct.icon] || FileText;
                const isSelected = selected.includes(ct.id);

                // Social ordering preference: show LinkedIn before Twitter (next row after Instagram chips)
                if (category === 'social' && (ct.id === 'social-twitter' || ct.id === 'social-linkedin')) {
                  // handled in a second pass below
                  return null;
                }

                // Replace default Instagram chip with two chips: multi-post first, then single-post
                if (ct.id === 'social-instagram') {
                  const singleSelected = isSelected && instagramVariant === 'single';
                  const carouselSelected = isSelected && instagramVariant === 'carousel';

                  return (
                    <div key={ct.id} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setInstagramVariant('carousel');
                          if (carouselSelected || !isSelected) onToggle('social-instagram');
                        }}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-md border bg-background/70 px-3 py-2 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                          carouselSelected && 'border-primary/60 bg-primary/10 ring-1 ring-primary/20'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-md',
                            carouselSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <Instagram className="h-4 w-4" />
                        </span>
                        <span>Instagram (Multi-Post)</span>
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
                            'ml-1 select-none rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                            includeInstagramCarouselImages
                              ? 'border-primary/40 bg-primary/10 text-primary dark:text-primary'
                              : 'border-border text-muted-foreground hover:bg-muted'
                          )}
                        >
                          {includeInstagramCarouselImages ? 'Images: On' : 'Images: Off'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setInstagramVariant('single');
                          if (singleSelected || !isSelected) onToggle('social-instagram');
                        }}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-md border bg-background/70 px-3 py-2 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                          singleSelected && 'border-primary/60 bg-primary/10 ring-1 ring-primary/20'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-md',
                            singleSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <Instagram className="h-4 w-4" />
                        </span>
                        <span>Instagram (Single Post)</span>
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
                            'ml-1 select-none rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                            includeInstagramSingleImages
                              ? 'border-primary/40 bg-primary/10 text-primary dark:text-primary'
                              : 'border-border text-muted-foreground hover:bg-muted'
                          )}
                        >
                          {includeInstagramSingleImages ? 'Images: On' : 'Images: Off'}
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
                      'inline-flex items-center gap-2 rounded-md border bg-background/70 px-3 py-2 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                      isSelected && 'border-primary/60 bg-primary/10 ring-1 ring-primary/20'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-md',
                        isSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{ct.label}</span>
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
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                          'inline-flex items-center gap-2 rounded-md border bg-background/70 px-3 py-2 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                          isSelected && 'border-primary/60 bg-primary/10 ring-1 ring-primary/20'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-md',
                            isSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>{ct.label}</span>
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
  );
}
