'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
  Bookmark,
  Calendar,
  FileText,
  Sparkles,
  TrendingUp,
  Users,
  WandSparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  className,
}: {
  selectedSource: any;
  detailContent?: any;
  bodyPreview: string;
  onClear: () => void;
  onUseArticle: () => void;
  className?: string;
}) {
  const article = selectedSource?.data ?? selectedSource ?? null;

  if (!article) {
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
  const paragraphs = getBodyParagraphs(article, bodyPreview);
  const tags = Array.isArray(detailContent?.tags || article.tags) ? (detailContent?.tags || article.tags) : [];

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

        <div className="absolute right-5 top-5 z-20 flex items-center gap-2">
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

        <div className="relative z-10 flex min-h-[270px] flex-col justify-end p-7 text-white sm:p-8 2xl:min-h-[300px]">
          <div className="mb-4 inline-flex w-fit items-center rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-100 shadow-lg shadow-cyan-950/20 backdrop-blur">
            {decodeEntities(designation)}
          </div>
          <h3 className="max-w-[820px] text-balance font-serif text-3xl font-semibold leading-[1.08] tracking-normal text-white drop-shadow-2xl sm:text-[2.15rem] 2xl:text-[2.6rem]">
            {title}
          </h3>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-white/82">
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatDate(publishedAt)}
            </span>
            {filename ? <span className="max-w-[280px] truncate">{String(filename)}</span> : null}
            {tags.length ? <span>{tags.length} content signals</span> : null}
          </div>
        </div>
      </div>

      <div className={cn('relative z-10 grid flex-1 gap-6 px-6 pb-7 pt-7 sm:px-8', takeaways.length ? 'md:grid-cols-[0.68fr_1fr]' : 'md:grid-cols-1')}>
        {takeaways.length ? (
          <aside className="space-y-4">
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
          </aside>
        ) : null}

        <article className={cn('border-slate-200/80', takeaways.length && 'md:border-l md:pl-6')}>
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
          <Button
            className="h-12 rounded-2xl bg-[linear-gradient(135deg,#5b8cff,#9b4dff)] px-8 font-semibold text-white shadow-[0_0_28px_rgba(99,102,241,0.42)] transition hover:-translate-y-0.5 hover:shadow-[0_0_38px_rgba(139,92,246,0.56)]"
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
