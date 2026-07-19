'use client';

import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { SourceContent } from '@/lib/types/content';
import { designationLabelClass, overflowLabelClass, tagLabelClass } from '@/lib/content-label-colors';
import { getSourceContentDesignation } from '@/lib/source-content/designation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar, ExternalLink, FileText, MoreHorizontal, PlayCircle, Sparkles, Target, TrendingUp, User, Users, WandSparkles } from 'lucide-react';

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
  variant?: 'grid' | 'small-grid' | 'detailed-grid' | 'stacked' | 'quick';
}

export function ContentCard({
  content,
  isSelected = false,
  onSelect,
  onViewDetail,
  selectable = false,
  variant = 'grid',
}: ContentCardProps) {
  const thumbnailUrl = getThumbnailUrl(content);
  const filename = content.metadata?.extraPropertiesSelected?.BasContentFilename || 'Unavailable';
  const isFinraApproved = String(content.metadata?.extraPropertiesSelected?.FinraApproved ?? '').toLowerCase() === 'true';
  const publisherLabel = getPublisherLabel(content);
  const designation = getSourceContentDesignation(content);
  const publishedLabel = content.publishedAt
    ? format(new Date(content.publishedAt), 'MMM d, yyyy')
    : 'Date unavailable';
  const typeIcon = String(content.type || '').toLowerCase().includes('video') ? PlayCircle : FileText;
  const TypeIcon = typeIcon;

  if (variant === 'small-grid') {
    return (
      <Card
        className={cn(
          'group h-full overflow-hidden rounded-lg border-border bg-card shadow-sm transition-all hover:border-primary/50 hover:shadow-md',
          isSelected && 'border-primary ring-2 ring-primary/25'
        )}
      >
        <CardContent className="relative flex h-full gap-4 p-4">
          <div className="relative h-32 w-28 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary/18 via-info/8 to-secondary sm:w-32">
            {thumbnailUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
                style={{ backgroundImage: `url("${thumbnailUrl.replace(/"/g, '\\"')}")` }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-primary/45">
                <FileText className="h-8 w-8" />
              </div>
            )}
          </div>

          {selectable ? (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect?.(content.id, checked as boolean)}
              className="absolute right-4 top-4 h-6 w-6 rounded-md border-slate-300 bg-white/95 shadow-sm data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              aria-label={`Select ${content.title}`}
            />
          ) : null}

          <div className="flex min-w-0 flex-1 flex-col pr-8">
            <div className="flex min-h-6 flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('text-[11px] font-medium', designationLabelClass(designation))}>
                {designation}
              </Badge>
              {isFinraApproved ? (
                <Badge className="bg-primary text-[10px] text-primary-foreground hover:bg-primary">FINRA</Badge>
              ) : null}
            </div>
            <CardTitle className="mt-2 line-clamp-3 text-base font-semibold leading-snug">
              {content.title}
            </CardTitle>
            <p className="mt-3 line-clamp-3 text-sm leading-5 text-muted-foreground">
              {content.excerpt || 'No summary available for this content item.'}
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {publishedLabel}
              </span>
              <span className="h-4 w-px bg-border" aria-hidden />
              <span className="inline-flex items-center gap-1">
                <TypeIcon className="h-3.5 w-3.5" />
                {content.type || 'Content'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetail?.(content)}
                className="ml-auto h-7 px-2 text-primary"
              >
                Open
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'detailed-grid') {
    return (
      <Card
        className={cn(
          'group h-full overflow-hidden rounded-lg border-border bg-card shadow-sm transition-all hover:border-primary/50 hover:shadow-md',
          isSelected && 'border-primary ring-2 ring-primary/25'
        )}
      >
        <CardContent className="relative flex h-full flex-col gap-4 p-4">
          {selectable ? (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect?.(content.id, checked as boolean)}
              className="absolute right-4 top-4 z-10 h-6 w-6 rounded-md border-slate-300 bg-white/95 shadow-sm data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              aria-label={`Select ${content.title}`}
            />
          ) : null}

          <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
            <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-gradient-to-br from-primary/18 via-info/8 to-secondary">
              {thumbnailUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
                  style={{ backgroundImage: `url("${thumbnailUrl.replace(/"/g, '\\"')}")` }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-primary/45">
                  <FileText className="h-9 w-9" />
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-2 pr-8">
              <div className="flex min-h-5 flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn('text-[11px] font-medium', designationLabelClass(designation))}>
                  {designation}
                </Badge>
                {isFinraApproved ? (
                  <Badge className="bg-primary text-[10px] text-primary-foreground hover:bg-primary">FINRA</Badge>
                ) : null}
                <span aria-hidden className="text-muted-foreground">•</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <TypeIcon className="h-3 w-3" />
                  {content.type || 'Content'}
                </span>
              </div>
              <CardTitle className="line-clamp-2 text-lg font-semibold leading-snug">{content.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-primary">{publisherLabel}</span>
                <span aria-hidden>•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {publishedLabel}
                </span>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-foreground">Summary</div>
                <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
                  {content.excerpt || 'No summary available for this content item.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-h-[74px] rounded-lg border border-cyan-100 bg-cyan-50/70 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-800">
                <Sparkles className="h-3.5 w-3.5" />
                Key takeaways
              </div>
              {content.keyTakeaways?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-700">
                  {content.keyTakeaways.slice(0, 2).map((takeaway) => {
                    const Icon = content.keyTakeaways?.indexOf(takeaway) === 0 ? TrendingUp : Users;
                    return (
                      <li key={takeaway} className="line-clamp-1">
                        <Icon className="-ml-4 mr-1.5 inline h-3.5 w-3.5 text-cyan-700" />
                        {takeaway}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">No takeaways available yet.</p>
              )}
            </div>

            <div className="min-h-[74px] rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <Target className="h-3.5 w-3.5" />
                Recommended audience
              </div>
              <div className="mt-2 grid grid-cols-[22px_minmax(0,1fr)] gap-2 text-xs leading-5 text-slate-700">
                <Users className="mt-0.5 h-3.5 w-3.5 text-blue-700" />
                <p className="line-clamp-2">{content.recommendedAudience || 'No audience recommendation available yet.'}</p>
              </div>
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-2">
            {content.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className={cn('text-xs font-normal', tagLabelClass(tag))}>
                {tag}
              </Badge>
            ))}
            {content.tags.length > 3 ? (
              <Badge variant="outline" className={cn('text-xs font-normal', overflowLabelClass())}>
                +{content.tags.length - 3}
              </Badge>
            ) : null}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetail?.(content)}
                className="h-8 gap-1.5 text-primary"
              >
                Preview
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetail?.(content)}
                className="h-8 min-w-[116px] border-primary/50 text-primary"
              >
                View details
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions" title="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'quick') {
    return (
      <div
        className={cn(
          'grid min-h-[62px] grid-cols-[32px_minmax(280px,1.7fr)_minmax(140px,0.8fr)_minmax(120px,0.65fr)_minmax(140px,0.75fr)_minmax(110px,0.55fr)_92px] items-center gap-4 border-b border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-secondary/40',
          isSelected && 'bg-primary/5 ring-1 ring-inset ring-primary/40'
        )}
      >
        <div>
          {selectable ? (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect?.(content.id, checked as boolean)}
              className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              aria-label={`Select ${content.title}`}
            />
          ) : null}
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary/18 via-info/8 to-secondary">
            {thumbnailUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${thumbnailUrl.replace(/"/g, '\\"')}")` }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-primary/45">
                <FileText className="h-4 w-4" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="line-clamp-1 font-semibold leading-5 text-foreground">{content.title}</div>
            <div className="line-clamp-1 text-xs leading-5 text-muted-foreground">
              {content.excerpt || filename}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <Badge variant="outline" className={cn('max-w-full truncate text-[11px] font-medium', designationLabelClass(designation))}>
            {designation}
          </Badge>
          {isFinraApproved ? (
            <Badge className="ml-1 bg-primary text-[10px] text-primary-foreground hover:bg-primary">FINRA</Badge>
          ) : null}
        </div>

        <div className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <TypeIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{content.type || 'Content'}</span>
        </div>

        <div className="truncate text-xs text-muted-foreground">{publisherLabel}</div>
        <div className="truncate text-xs text-muted-foreground">{publishedLabel}</div>

        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onViewDetail?.(content)}
            className="h-8 w-8"
            aria-label={`Preview ${content.title}`}
            title="Preview"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions" title="More actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (variant === 'stacked') {
    return (
      <Card
        className={cn(
          'group overflow-hidden rounded-lg border-border bg-card shadow-sm transition-all hover:border-primary/50 hover:shadow-md',
          isSelected && 'border-primary ring-2 ring-primary/25'
        )}
      >
        <div className="grid gap-4 p-4 lg:grid-cols-[28px_190px_minmax(260px,1.2fr)_minmax(260px,1fr)_minmax(220px,0.85fr)_140px] lg:items-start">
          <div className="pt-1">
            {selectable ? (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect?.(content.id, checked as boolean)}
                className="h-5 w-5 rounded border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                aria-label={`Select ${content.title}`}
              />
            ) : null}
          </div>

          <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-gradient-to-br from-primary/18 via-info/8 to-secondary">
            {thumbnailUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
                style={{ backgroundImage: `url("${thumbnailUrl.replace(/"/g, '\\"')}")` }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-primary/45">
                <FileText className="h-9 w-9" />
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex min-h-5 flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('text-[11px] font-medium', designationLabelClass(designation))}>
                {designation}
              </Badge>
              {isFinraApproved ? (
                <Badge className="bg-primary text-[10px] text-primary-foreground hover:bg-primary">FINRA</Badge>
              ) : null}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <TypeIcon className="h-3 w-3" />
                {content.type || 'Content'}
              </span>
            </div>
            <CardTitle className="line-clamp-2 text-base font-semibold leading-snug">{content.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-primary">{publisherLabel}</span>
              <span aria-hidden>•</span>
              <span>{publishedLabel}</span>
              <span aria-hidden>•</span>
              <span className="truncate">Filename: {filename}</span>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-foreground">Summary</div>
              <p className="line-clamp-3 text-sm leading-5 text-muted-foreground">
                {content.excerpt || 'No summary available for this content item.'}
              </p>
            </div>
          </div>

          <div className="min-h-[116px] rounded-lg border border-cyan-100 bg-cyan-50/70 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-800">
              <Sparkles className="h-3.5 w-3.5" />
              Key takeaways
            </div>
            {content.keyTakeaways?.length ? (
              <div className="mt-2 space-y-2 text-xs leading-5 text-slate-700">
                {content.keyTakeaways.slice(0, 3).map((takeaway, index) => {
                  const Icon = index === 0 ? TrendingUp : index === 1 ? Users : WandSparkles;
                  return (
                    <div key={takeaway} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2">
                      <Icon className="mt-0.5 h-3.5 w-3.5 text-cyan-700" />
                      <p className="line-clamp-2">{takeaway}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">No takeaways available yet.</p>
            )}
          </div>

          <div className="min-h-[116px] rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <Target className="h-3.5 w-3.5" />
              Recommended audience
            </div>
            <div className="mt-2 grid grid-cols-[22px_minmax(0,1fr)] gap-2 text-xs leading-5 text-slate-700">
              <Users className="mt-0.5 h-3.5 w-3.5 text-blue-700" />
              <p className="line-clamp-3">{content.recommendedAudience || 'No audience recommendation available yet.'}</p>
            </div>
          </div>

          <div className="flex h-full min-h-[116px] flex-col items-end justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetail?.(content)}
              className="h-8 min-w-[116px] border-primary/50 text-primary"
            >
              View details
            </Button>
          </div>
        </div>
      </Card>
    );
  }

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
            <Badge
              variant="outline"
              className={cn('text-[11px] font-medium', designationLabelClass(designation))}
            >
              {designation}
            </Badge>
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
                <ExternalLink className="ml-1.5 h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
