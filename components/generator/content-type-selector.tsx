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
            <div className="flex flex-wrap gap-3">
              {types.map((contentType) => {
                const Icon = iconMap[contentType.icon] || FileText;
                const isSelected = selected.includes(contentType.id);
                
                return (
                  <Card
                    key={contentType.id}
                    className={cn(
                      'cursor-pointer transition-all hover:border-primary/50 h-[250px] w-[250px] flex flex-col',
                      isSelected && 'border-primary ring-1 ring-primary bg-primary/5'
                    )}
                    onClick={() => onToggle(contentType.id)}
                  >
                    <CardHeader className="pb-1.5 pt-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg',
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-medium">
                            {contentType.label}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-4 flex flex-1 flex-col">
                      <div>
                        <CardDescription className="text-xs">
                          {contentType.description}
                        </CardDescription>
                        {contentType.maxLength && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            Max {contentType.maxLength} chars
                          </Badge>
                        )}
                      </div>

                      {contentType.id === 'social-instagram' && onToggleInstagramImage ? (
                        <div className="mt-3 border-t border-border/60 pt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleInstagramImage();
                            }}
                            className={cn(
                              'w-full rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors',
                              includeInstagramImage
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background hover:bg-muted'
                            )}
                          >
                            {includeInstagramImage ? 'Image ON' : 'Image OFF'}
                          </button>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
