'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CONTENT_TYPES, getContentTypesByCategory } from '@/lib/content-config';
import type { ContentType } from '@/lib/types/content';
import {
  Twitter,
  Linkedin,
  Instagram,
  Mail,
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
}

export function ContentTypeSelector({ selected, onToggle, includeInstagramImage = false, onToggleInstagramImage }: ContentTypeSelectorProps) {
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
            <div className="flex flex-wrap gap-2">
              {types.map((contentType) => {
                const Icon = iconMap[contentType.icon] || FileText;
                const isSelected = selected.includes(contentType.id);
                
                return (
                  <button
                    key={contentType.id}
                    type="button"
                    onClick={() => onToggle(contentType.id)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-2xl border bg-background/70 px-3 py-2 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                      isSelected && 'border-violet-500/60 bg-violet-500/10 ring-1 ring-violet-500/20'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-xl',
                        isSelected ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground'
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
                            ? 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        )}
                        aria-label="Toggle Instagram images"
                      >
                        {includeInstagramImage ? 'Images: On' : 'Images: Off'}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
