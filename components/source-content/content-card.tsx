'use client';

import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { SourceContent } from '@/lib/types/content';
import { designationLabelClass, overflowLabelClass, tagLabelClass } from '@/lib/content-label-colors';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar, ExternalLink, FileText, User } from 'lucide-react';

function parseMetadata(content: SourceContent) {
  const meta = content.metadata;
  if (typeof meta !== 'string') return meta;
  try {
    return JSON.parse(meta) as SourceContent['metadata'];
  } catch {
    return null;
  }
}

function extraPropertyFromArray(meta: SourceContent['metadata'] | null, key: string): string | undefined {
  const arr = meta?.raw?.extra_properties;
  if (!Array.isArray(arr)) return undefined;

  const hit = arr.find((item: any) => String(item?.key || '') === key);
  const value = hit?.stringValue ?? hit?.value ?? hit?.string_value;
  return typeof value === 'string' ? value : undefined;
}

function getThumbnailUrl(content: SourceContent) {
  const meta = parseMetadata(content);
  const extraMap: any = meta?.extraProperties || meta?.raw?.extraProperties || null;

  const thumb =
    (extraMap?.['SocialMediaPlatformImages.LinkedIn'] as string | undefined) ||
    (meta?.['SocialMediaPlatformImages.LinkedIn'] as string | undefined) ||
    extraPropertyFromArray(meta, 'SocialMediaPlatformImages.LinkedIn') ||
    (meta?.SocialMediaPlatformImages?.LinkedIn as string | undefined) ||
    (meta?.SocialMediaPlatformImages?.linkedIn as string | undefined) ||
    (meta?.SocialMediaPlatformImages?.linkedin as string | undefined) ||
    (meta?.socialMediaPlatformImages?.LinkedIn as string | undefined) ||
    (meta?.socialMediaPlatformImages?.linkedIn as string | undefined) ||
    (meta?.socialMediaPlatformImages?.linkedin as string | undefined) ||
    (extraMap?.['SocialMediaPlatformImages.Thumbnail'] as string | undefined) ||
    (meta?.['SocialMediaPlatformImages.Thumbnail'] as string | undefined) ||
    extraPropertyFromArray(meta, 'SocialMediaPlatformImages.Thumbnail') ||
    (meta?.SocialMediaPlatformImages?.Thumbnail as string | undefined) ||
    (meta?.SocialMediaPlatformImages?.thumbnail as string | undefined) ||
    (meta?.socialMediaPlatformImages?.Thumbnail as string | undefined) ||
    (meta?.socialMediaPlatformImages?.thumbnail as string | undefined) ||
    (content.imageUrl as string | undefined);

  return thumb?.trim() || null;
}

function getPublisherLabel(content: SourceContent) {
  if (!content.publisher) return 'Unavailable';
  if (content.publisher === 'broadridge-forefield') return 'Broadridge Advisor Content';
  if (content.publisher === 'publisher-content') return 'Publisher Content';
  if (content.publisher === 'sample') return 'Sample';
  return content.publisher;
}

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
  const thumbnailUrl = getThumbnailUrl(content);
  const filename = content.metadata?.extraPropertiesSelected?.BasContentFilename || 'Unavailable';
  const isFinraApproved = String(content.metadata?.extraPropertiesSelected?.FinraApproved ?? '').toLowerCase() === 'true';

  return (
    <Card
      className={cn(
        'group h-full overflow-hidden rounded-lg border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md',
        isSelected && 'border-primary ring-2 ring-primary/25'
      )}
    >
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-primary/18 via-info/8 to-secondary">
        {thumbnailUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
            style={{ backgroundImage: `url("${thumbnailUrl.replace(/"/g, '\\"')}")` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-primary/45">
            <FileText className="h-10 w-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent" />

        {selectable ? (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect?.(content.id, checked as boolean)}
            className="absolute right-3 top-3 h-8 w-8 rounded-md border-white/70 bg-white/90 shadow-sm data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
        ) : null}
      </div>

      <CardContent className="flex min-h-[224px] flex-1 flex-col p-5">
        <div className="space-y-3">
          <div className="flex min-h-5 flex-wrap items-center gap-2">
            {content.type ? (
              <Badge
                variant="outline"
                className={cn('text-[11px] font-medium', designationLabelClass(content.type))}
              >
                {content.type}
              </Badge>
            ) : null}
            {isFinraApproved ? (
              <Badge className="bg-primary text-[10px] text-primary-foreground hover:bg-primary">
                FINRA
              </Badge>
            ) : null}
          </div>

          <CardTitle className="line-clamp-2 text-base font-semibold leading-snug">
            {content.title}
          </CardTitle>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-primary">
              <User className="h-3 w-3" />
              {getPublisherLabel(content)}
            </span>
            <span aria-hidden>•</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {content.publishedAt
                ? format(new Date(content.publishedAt), 'MMM d, yyyy')
                : 'Published date unavailable'}
            </span>
          </div>

          <div className="truncate text-xs text-muted-foreground">
            Filename: {filename}
          </div>

          <p className="line-clamp-3 min-h-[60px] text-sm leading-5 text-muted-foreground">
            {content.excerpt || 'No summary available for this content item.'}
          </p>
        </div>

        <div className="mt-auto">
          <div className="flex min-h-[24px] flex-wrap gap-1.5">
            {content.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className={cn('text-xs font-normal', tagLabelClass(tag))}>
                {tag}
              </Badge>
            ))}
            {content.tags.length > 4 && (
              <Badge variant="outline" className={cn('text-xs font-normal', overflowLabelClass())}>
                +{content.tags.length - 4}
              </Badge>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetail?.(content)}
                className="h-8 px-2"
              >
                View Details
              </Button>
              {content.url && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8 px-2"
                >
                  <a href={content.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Source
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
