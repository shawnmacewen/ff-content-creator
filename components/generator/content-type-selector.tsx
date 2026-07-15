'use client';

import { getContentTypesByCategory } from '@/lib/content-config';
import type { ContentType } from '@/lib/types/content';
import {
  Twitter,
  Linkedin,
  Instagram,
  Mail,
  Mails,
  Newspaper,
  FileText,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  mail: Mail,
  mails: Mails,
  newspaper: Newspaper,
  'file-text': FileText,
  'bar-chart': BarChart3,
};

const categoryLabels: Record<string, string> = {
  social: 'Social Media',
  email: 'Email & Newsletter',
  'long-form': 'Long-Form Content',
};

interface ContentTypeSelectorProps {
  selected: ContentType[];
  onToggle: (type: ContentType) => void;
  includeInstagramImage?: boolean;
  onToggleInstagramImage?: () => void;
  instagramImageMode?: 'single' | 'carousel';
  onInstagramImageModeChange?: (mode: 'single' | 'carousel') => void;
}

export function ContentTypeSelector({
  selected,
  onToggle,
  includeInstagramImage = false,
  onToggleInstagramImage,
  instagramImageMode = 'single',
  onInstagramImageModeChange,
}: ContentTypeSelectorProps) {
  const categories = ['social', 'email', 'long-form'] as const;

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const types = getContentTypesByCategory(category);
        
        return (
          <div key={category} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {categoryLabels[category]}
            </h3>
            {category === 'social' ? (
              <p className="text-xs text-muted-foreground">
                Image generation is available for Instagram. LinkedIn and X generate copy-only posts for now.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {types.map((contentType) => {
                const Icon = iconMap[contentType.icon] || FileText;
                const isSelected = selected.includes(contentType.id);
                
                return (
                  <div key={contentType.id} className="contents">
                  <button
                    type="button"
                    onClick={() => onToggle(contentType.id)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-md border bg-background/70 px-3 py-2 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                      isSelected && 'border-primary/60 bg-primary/10 ring-1 ring-primary/20'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-md',
                        isSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span>{contentType.label}</span>

                    {contentType.id === 'social-instagram' && onToggleInstagramImage ? (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleInstagramImage();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            onToggleInstagramImage();
                          }
                        }}
                        className={cn(
                          'ml-1 select-none rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                          includeInstagramImage
                            ? 'border-primary/40 bg-primary/10 text-primary dark:text-primary'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        )}
                        aria-label="Toggle Instagram images"
                      >
                        {includeInstagramImage ? 'Images: On' : 'Images: Off'}
                      </span>
                    ) : null}
                  </button>
                  {contentType.id === 'social-instagram' && isSelected && includeInstagramImage && onInstagramImageModeChange ? (
                    <div className="flex w-full flex-wrap items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Instagram image format</span>
                      <button
                        type="button"
                        onClick={() => onInstagramImageModeChange('single')}
                        className={cn(
                          'rounded-md border px-2.5 py-1 transition-colors',
                          instagramImageMode === 'single'
                            ? 'border-primary/50 bg-primary/10 text-primary'
                            : 'border-border bg-background hover:bg-muted'
                        )}
                      >
                        Single image
                      </button>
                      <button
                        type="button"
                        onClick={() => onInstagramImageModeChange('carousel')}
                        className={cn(
                          'rounded-md border px-2.5 py-1 transition-colors',
                          instagramImageMode === 'carousel'
                            ? 'border-primary/50 bg-primary/10 text-primary'
                            : 'border-border bg-background hover:bg-muted'
                        )}
                      >
                        Carousel images
                      </button>
                    </div>
                  ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
