'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { SourceContent } from '@/lib/types/content';
import { format } from 'date-fns';
import { Calendar, ExternalLink, User } from 'lucide-react';

interface ContentCardProps {
  content: SourceContent;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onViewDetail?: (content: SourceContent) => void;
  selectable?: boolean;
}

export function ContentCard({
  content,
  isSelected = false,
  onSelect,
  onViewDetail,
  selectable = false,
}: ContentCardProps) {
  return (
    <Card
      className={`bg-card border-border transition-colors hover:border-primary/50 ${
        isSelected ? 'border-primary ring-1 ring-primary' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {selectable && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect?.(content.id, checked as boolean)}
                className="mt-1"
              />
            )}
            <div className="space-y-1 flex-1">
              <CardTitle className="text-base font-medium leading-tight line-clamp-2">
                {content.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 text-xs">
                <User className="h-3 w-3" />
                <span
                  className={
                    content.publisher === 'publisher-content'
                      ? 'text-purple-500'
                      : content.sourceSystem === 'advisorstream'
                        ? 'text-blue-500'
                        : content.sourceSystem === 'sample-seed'
                          ? 'text-green-500'
                          : 'text-blue-500'
                  }
                >
                  {content.publisher
                    ? content.publisher === 'broadridge-forefield'
                      ? 'Broadridge Forefield'
                      : content.publisher === 'publisher-content'
                        ? 'Publisher Content'
                        : content.publisher === 'sample'
                          ? 'Sample'
                          : content.publisher
                    : 'Unavailable'}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {content.publishedAt
                    ? format(new Date(content.publishedAt), 'MMM d, yyyy')
                    : 'Published date unavailable'}
                </span>
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge variant="secondary" className="shrink-0">
              {content.type}
            </Badge>

          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3">{content.excerpt}</p>
        <div className="flex flex-wrap gap-1.5">
          {content.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {content.tags.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{content.tags.length - 4}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetail?.(content)}
            className="h-8"
          >
            View Details
          </Button>
          {content.url && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8"
            >
              <a href={content.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Source
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
