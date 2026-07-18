'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
  Bookmark,
  Calendar,
  Check,
  ExternalLink,
  FileText,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  WandSparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { articleActionButtonClassName } from '@/lib/generator/article-action-button';
import { cn } from '@/lib/utils';

function decodeEntities(input: string): string {
  const raw = String(input || '');
  return raw
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function parseMetadata(article: any) {
  const meta = article?.metadata;
  if (typeof meta !== 'string') return meta || null;
  try {
    return JSON.parse(meta);
  } catch {
    return null;
  }
}

function extraPropertyFromArray(meta: any, key: string): string | undefined {
  const arr = meta?.raw?.extra_properties;
  if (!Array.isArray(arr)) return undefined;
  const hit = arr.find((item: any) => String(item?.key || '') === key);
  const value = hit?.stringValue ?? hit?.value ?? hit?.string_value;
  return typeof value === 'string' ? value : undefined;
}

function getImageUrl(article: any) {
  const meta = parseMetadata(article);
  const extraMap = meta?.extraProperties || meta?.raw?.extraProperties || null;

  const image =
    extraMap?.['SocialMediaPlatformImages.LinkedIn'] ||
    meta?.['SocialMediaPlatformImages.LinkedIn'] ||
    extraPropertyFromArray(meta, 'SocialMediaPlatformImages.LinkedIn') ||
    meta?.SocialMediaPlatformImages?.LinkedIn ||
    meta?.SocialMediaPlatformImages?.linkedIn ||
    meta?.SocialMediaPlatformImages?.linkedin ||
    meta?.socialMediaPlatformImages?.LinkedIn ||
    meta?.socialMediaPlatformImages?.linkedIn ||
    meta?.socialMediaPlatformImages?.linkedin ||
    extraMap?.['SocialMediaPlatformImages.Thumbnail'] ||
    meta?.['SocialMediaPlatformImages.Thumbnail'] ||
    extraPropertyFromArray(meta, 'SocialMediaPlatformImages.Thumbnail') ||
    meta?.SocialMediaPlatformImages?.Thumbnail ||
    meta?.SocialMediaPlatformImages?.thumbnail ||
    meta?.socialMediaPlatformImages?.Thumbnail ||
    meta?.socialMediaPlatformImages?.thumbnail ||
    article?.imageUrl;

  return typeof image === 'string' && image.trim() ? image.trim() : null;
}

function getDesignation(article: any) {
  const meta = parseMetadata(article);
  const extra = meta?.extraProperties || meta?.raw?.extraProperties || {};
  return (
    extra?.ContentDesignation ||
    extra?.contentDesignation ||
    extra?.Designation ||
    extra?.designation ||
    extra?.APContentType ||
    article?.type ||
    'Editorial Source'
  );
}

function getFilename(article: any) {
  const meta = parseMetadata(article);
  const extra = meta?.extraProperties || meta?.raw?.extraProperties || {};
  return extra?.BasContentFilename || extra?.basContentFilename || article?.externalId || null;
}

function cleanText(input: string) {
  return decodeEntities(input)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<paragraph[^>]*>([\s\S]*?)<\/paragraph>/gi, '$1\n\n')
    .replace(/<container_text[^>]*>([\s\S]*?)<\/container_text>/gi, '\n\n$1\n')
    .replace(/<document_title[^>]*>([\s\S]*?)<\/document_title>/gi, '\n\n$1\n')
    .replace(/<short_title[^>]*>([\s\S]*?)<\/short_title>/gi, '\n\n$1\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getBodyParagraphs(article: any, bodyPreview: string) {
  const preferred = String(article?.excerpt || '').trim()
    ? `${article.excerpt}\n\n${bodyPreview}`
    : bodyPreview || String(article?.bodyText || article?.body || '');

  return cleanText(preferred)
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 20)
    .slice(0, 4);
}

function formatDate(value: unknown) {
  if (!value) return 'Date unavailable';
  try {
    return format(new Date(String(value)), 'MMM d, yyyy');
  } catch {
    return String(value).split('T')[0] || 'Date unavailable';
  }
}

export function SelectedArticlePreview({
  selectedSource,
  detailContent,
  bodyPreview,
  onClear,
  onUseArticle,
  onViewDetails,
  className,
  campaignCompact = false,
  campaignLayout = 'summary',
}: {
  selectedSource: any;
  detailContent?: any;
  bodyPreview: string;
  onClear: () => void;
  onUseArticle: () => void;
  onViewDetails?: () => void;
  className?: string;
  campaignCompact?: boolean;
  campaignLayout?: 'summary' | 'spotlight';
}) {
  const article = selectedSource?.data ?? selectedSource ?? null;

  if (!article) {
    if (campaignCompact) {
      return (
        <div className={cn('flex min-h-[520px] items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center', className)}>
          <div className="max-w-xs space-y-3">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="text-base font-semibold text-slate-950">Select a source article</div>
            <p className="text-sm leading-6 text-slate-600">The campaign source preview will appear here.</p>
          </div>
        </div>
      );
    }

    return (
      <div className={cn('flex min-h-[640px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-dashed border-primary/20 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(239,246,255,0.72))] p-8 text-center shadow-sm', className)}>
        <div className="max-w-sm space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div className="text-lg font-semibold">Select an article</div>
          <p className="text-sm leading-6 text-muted-foreground">
            The selected source will open here with key takeaways and article text.
          </p>
        </div>
      </div>
    );
  }

  const title = decodeEntities(String(article.title || 'Untitled article'));
  const imageUrl = getImageUrl(article);
  const designation = String(getDesignation(article));
  const filename = getFilename(article);
  const publishedAt = article.publishedAt || article.published_at;
  const takeawaySource = detailContent?.keyTakeaways || article.keyTakeaways;
  const takeaways: string[] = Array.isArray(takeawaySource)
    ? takeawaySource.map((item: string) => decodeEntities(String(item))).filter(Boolean).slice(0, 3)
    : [];
  const recommendedAudience = decodeEntities(String(detailContent?.recommendedAudience || article.recommendedAudience || '')).trim();
  const paragraphs = getBodyParagraphs(article, bodyPreview);
  const tags = Array.isArray(detailContent?.tags || article.tags) ? (detailContent?.tags || article.tags) : [];
  const summary = decodeEntities(String(article.excerpt || paragraphs[0] || 'This selected article will ground the generated campaign.'));
  const focusLabels = [
    tags[0],
    tags[1],
    recommendedAudience,
    takeaways[0]?.split(/\s+/).slice(0, 4).join(' '),
    designation,
  ]
    .map((item) => decodeEntities(String(item || '')).trim())
    .filter(Boolean)
    .filter((item, index, array) => array.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, 3);
  while (focusLabels.length < 3) {
    focusLabels.push(['Campaign angle', 'Audience fit', 'Planning cue'][focusLabels.length]);
  }

  if (campaignCompact) {
    if (campaignLayout === 'spotlight') {
      return (
        <section className={cn('flex min-h-[520px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
          <div className="relative h-44 overflow-hidden bg-slate-100">
            {imageUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${imageUrl.replace(/"/g, '\\"')}")` }}
              />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#eff6ff,#dbeafe_52%,#f8fafc)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/55 via-slate-950/20 to-transparent" />
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <button
                type="button"
                onClick={onUseArticle}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950/45 px-3 text-xs font-semibold text-white backdrop-blur transition hover:bg-slate-950/60"
              >
                <Bookmark className="h-3.5 w-3.5" />
                Save
              </button>
              <button
                type="button"
                onClick={onClear}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                title="Clear selected article"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="absolute bottom-0 left-4 w-[min(430px,calc(100%-2rem))] translate-y-1/2 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
              <div className="inline-flex w-fit max-w-full rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <span className="truncate">{decodeEntities(designation)}</span>
              </div>
              <h3 className="mt-2 line-clamp-2 text-xl font-semibold leading-tight tracking-normal text-slate-950">{title}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {formatDate(publishedAt)}
                </span>
                {filename ? <span className="max-w-[140px] truncate">{filename}</span> : null}
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-5 px-5 pb-4 pt-16">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-950">Summary</h4>
                <p className="line-clamp-3 text-sm leading-6 text-slate-700">{summary}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-950">Content focus</h4>
                <div className="space-y-2">
                  {focusLabels.map((label, index) => {
                    const Icon = index === 0 ? TrendingUp : index === 1 ? Target : Sparkles;
                    return (
                      <div key={`${label}-${index}`} className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                        <span className="truncate">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-950">Key takeaways</h4>
              {takeaways.length ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {takeaways.map((item, index) => (
                    <div key={index} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2 text-xs leading-5 text-slate-700">
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-700">Review the full article preview for supporting details and audience fit.</p>
              )}
            </div>

            <div className="mt-auto flex items-center justify-between gap-3">
              {onViewDetails ? (
                <Button variant="link" className="h-auto p-0 text-primary" onClick={onViewDetails}>
                  View full article
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              ) : <span />}
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                <Check className="h-4 w-4" />
                Selected source
              </div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className={cn('flex min-h-[520px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
        <div className="relative h-40 overflow-hidden bg-slate-100">
          {imageUrl ? (
            <div
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url("${imageUrl.replace(/"/g, '\\"')}")` }}
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,#eff6ff,#dbeafe_52%,#f8fafc)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-slate-950/25 to-transparent" />
          <div className="absolute left-5 right-5 top-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex w-fit max-w-full rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <span className="truncate">{decodeEntities(designation)}</span>
              </div>
              <h3 className="mt-3 line-clamp-2 text-2xl font-semibold leading-tight tracking-normal text-white">{title}</h3>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onUseArticle}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950/45 px-3 text-xs font-semibold text-white backdrop-blur transition hover:bg-slate-950/60"
              >
                <Bookmark className="h-3.5 w-3.5" />
                Save
              </button>
              <button
                type="button"
                onClick={onClear}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                title="Clear selected article"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 pb-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              {formatDate(publishedAt)}
            </span>
            {filename ? <span className="max-w-[180px] truncate">{filename}</span> : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-950">Summary</h4>
              <p className="line-clamp-3 text-sm leading-6 text-slate-700">{summary}</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-950">Key takeaways</h4>
              {takeaways.length ? (
                <div className="space-y-2">
                  {takeaways.map((item, index) => (
                    <div key={index} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2 text-sm leading-6 text-slate-700">
                      <span className="mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-700">Review the full article preview for supporting details and audience fit.</p>
              )}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3">
            {onViewDetails ? (
              <Button variant="link" className="h-auto p-0 text-primary" onClick={onViewDetails}>
                View full article
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            ) : <span />}
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <Check className="h-4 w-4" />
              Selected source
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn('group relative isolate flex min-h-[640px] flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70', className)}>
      <div className="relative min-h-[270px] overflow-hidden bg-slate-950 2xl:min-h-[300px]">
        {imageUrl ? (
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
            style={{ backgroundImage: `url("${imageUrl.replace(/"/g, '\\"')}")` }}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(147,197,253,0.35),transparent_30%),linear-gradient(135deg,#071326,#18305d_55%,#0f172a)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.9),rgba(15,23,42,0.58)_42%,rgba(15,23,42,0.18)),linear-gradient(0deg,rgba(2,6,23,0.74),transparent_46%)]" />
        <div className="absolute inset-x-0 -bottom-4 h-40 bg-gradient-to-t from-white from-[10%] via-white/88 via-[42%] to-transparent" />

        <div className="absolute left-5 right-5 top-5 z-20 flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex w-fit max-w-full items-center rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-100 shadow-lg shadow-cyan-950/20 backdrop-blur">
              <span className="truncate">{decodeEntities(designation)}</span>
            </div>
            <h3 className="line-clamp-3 max-w-[820px] text-balance font-serif text-2xl font-semibold leading-[1.08] tracking-normal text-white drop-shadow-2xl sm:text-[2rem] 2xl:text-[2.45rem]">
              {title}
            </h3>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onUseArticle}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white shadow-lg shadow-black/20 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20"
              title="Save"
            >
              <Bookmark className="h-4 w-4" />
              Save
            </button>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-white"
              title="Clear selected article"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative z-10 flex min-h-[270px] flex-col justify-end p-5 sm:p-6 2xl:min-h-[300px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-slate-800">
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-700" />
              {formatDate(publishedAt)}
            </span>
            {filename ? <span className="max-w-[280px] truncate text-slate-700">{String(filename)}</span> : null}
            {tags.length ? <span className="text-slate-700">{tags.length} content signals</span> : null}
          </div>
        </div>
      </div>

      <div className={cn('relative z-10 grid flex-1 gap-6 px-6 pb-7 pt-7 sm:px-8', takeaways.length || recommendedAudience ? 'md:grid-cols-[0.68fr_1fr]' : 'md:grid-cols-1')}>
        {takeaways.length || recommendedAudience ? (
          <aside className="space-y-4">
            {takeaways.length ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-base font-semibold text-slate-950">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    Key Takeaways
                  </div>
                </div>

                <div className="space-y-3.5">
                  {takeaways.map((item, index) => {
                    const Icon = index === 0 ? TrendingUp : index === 1 ? Users : WandSparkles;
                    return (
                      <div key={index} className="grid grid-cols-[36px_minmax(0,1fr)] items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.18),0_12px_28px_rgba(6,182,212,0.12)]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="pt-0.5 text-[13px] font-semibold leading-5 text-slate-700" title={decodeEntities(item)}>
                          {item}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {recommendedAudience ? (
              <div className="space-y-3 border-t border-slate-200/80 pt-4">
                <div className="flex items-center gap-3 text-base font-semibold text-slate-950">
                  <Target className="h-5 w-5 text-blue-600" />
                  Recommended Audience
                </div>
                <div className="grid grid-cols-[36px_minmax(0,1fr)] items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.16),0_12px_28px_rgba(37,99,235,0.1)]">
                    <Users className="h-4 w-4" />
                  </div>
                  <p className="pt-0.5 text-[13px] font-semibold leading-5 text-slate-700">{recommendedAudience}</p>
                </div>
              </div>
            ) : null}
          </aside>
        ) : null}

        <article className={cn('border-slate-200/80', (takeaways.length || recommendedAudience) && 'md:border-l md:pl-6')}>
          <div className="space-y-3.5 break-words text-[13px] leading-6 text-slate-700">
            {paragraphs.length ? (
              paragraphs.slice(0, 3).map((paragraph, index) => (
                <p
                  key={index}
                  className={cn(
                    'line-clamp-4',
                    index === 0 && 'line-clamp-5 text-sm leading-6 first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-4xl first-letter:leading-[0.86] first-letter:text-slate-950'
                  )}
                >
                  {decodeEntities(paragraph)}
                </p>
              ))
            ) : (
              <p>The full provider article body is unavailable for this source.</p>
            )}
          </div>
        </article>
      </div>

      <div className="z-20 mt-auto bg-slate-950/95 px-7 py-5 shadow-[0_-18px_50px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {onViewDetails ? (
            <Button
              variant="outline"
              className="h-12 rounded-2xl border-white/15 bg-white/10 px-6 font-semibold text-white shadow-lg shadow-black/20 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20 hover:text-white"
              onClick={onViewDetails}
            >
              View Details
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          ) : null}
          <Button
            className={articleActionButtonClassName}
            onClick={onUseArticle}
          >
            <WandSparkles className="mr-2 h-4 w-4" />
            Use This Article
          </Button>
        </div>
      </div>
    </section>
  );
}
