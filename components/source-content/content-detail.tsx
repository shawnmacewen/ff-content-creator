'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import type { SourceContent } from '@/lib/types/content';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ExternalLink, User, Calendar, Copy, Check, FileText, X } from 'lucide-react';
import { useMemo, useState } from 'react';

const designationToneClasses = [
  'bg-primary/10 text-primary border-primary/25',
  'bg-info/10 text-info border-info/25',
  'bg-warning/10 text-warning border-warning/25',
  'bg-muted text-muted-foreground border-border',
  'bg-secondary text-secondary-foreground border-border',
];

function designationToneClass(value?: string | null) {
  const text = String(value || 'unknown');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return designationToneClasses[hash % designationToneClasses.length];
}

function parseMetadata(content: SourceContent | null) {
  const meta = content?.metadata;
  if (typeof meta !== 'string') return meta;
  try {
    return JSON.parse(meta) as SourceContent['metadata'];
  } catch {
    return null;
  }
}

function extraPropertyFromArray(meta: SourceContent['metadata'] | null | undefined, key: string): string | undefined {
  const arr = meta?.raw?.extra_properties;
  if (!Array.isArray(arr)) return undefined;

  const hit = arr.find((item: any) => String(item?.key || '') === key);
  const value = hit?.stringValue ?? hit?.value ?? hit?.string_value;
  return typeof value === 'string' ? value : undefined;
}

function getThumbnailUrl(content: SourceContent | null) {
  if (!content) return null;

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

function metadataValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'n/a';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'n/a';
  return String(value);
}

function isUrlValue(value: unknown) {
  if (typeof value !== 'string') return false;
  return /^https?:\/\/\S+$/i.test(value.trim());
}

function decodeEntitiesBrowser(input: string): string {
  const raw = String(input || '');
  try {
    const ta = document.createElement('textarea');
    ta.innerHTML = raw;
    return ta.value;
  } catch {
    return raw;
  }
}

function normalizeXmlToTextBrowser(input: string): string {
  const decoded = decodeEntitiesBrowser(String(input || ''));
  return decoded
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<paragraph[^>]*>([\s\S]*?)<\/paragraph>/gi, '$1\n\n')
    .replace(/<container_text[^>]*>([\s\S]*?)<\/container_text>/gi, '\n\n$1\n')
    .replace(/<document_title[^>]*>([\s\S]*?)<\/document_title>/gi, '\n\n$1\n')
    .replace(/<short_title[^>]*>([\s\S]*?)<\/short_title>/gi, '\n\n$1\n')
    // Strip any remaining tags.
    .replace(/<[^>]+>/g, ' ')
    // Collapse whitespace.
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildLooseSnippetRegex(snippet: string) {
  const cleaned = String(snippet || '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    // strip wrapping quotes that often appear in snippets
    .replace(/^['"“”]+/, '')
    .replace(/['"“”]+$/, '');

  if (!cleaned) return null;

  // Build a regex that is tolerant to whitespace, quote variants, and dash variants.
  let pattern = '';
  for (const ch of cleaned) {
    if (/\s/.test(ch)) {
      pattern += '\\s+';
      continue;
    }
    if (ch === '"' || ch === "'") {
      pattern += "[\\\"'“”‘’]";
      continue;
    }
    if (ch === '-') {
      pattern += '[-–—]';
      continue;
    }
    pattern += escapeRegex(ch);
  }

  try {
    return new RegExp(pattern, 'gi');
  } catch {
    return null;
  }
}

function highlightText(text: string, snippets: string[]): Array<string | { __highlight: true; text: string }> {
  const input = String(text || '');
  if (!snippets?.length) return [input];

  const regs = snippets
    .map((s) => buildLooseSnippetRegex(s))
    .filter(Boolean) as RegExp[];
  if (!regs.length) return [input];

  const ranges: Array<{ start: number; end: number }> = [];
  for (const r of regs) {
    // Reset lastIndex just in case.
    r.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = r.exec(input))) {
      if (!m[0]) break;
      ranges.push({ start: m.index, end: m.index + m[0].length });
      // Avoid infinite loops on zero-length matches.
      if (m.index === r.lastIndex) r.lastIndex += 1;
    }
  }

  if (!ranges.length) return [input];

  // Merge overlapping ranges.
  ranges.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const rr of ranges) {
    const last = merged[merged.length - 1];
    if (!last || rr.start > last.end) merged.push({ ...rr });
    else last.end = Math.max(last.end, rr.end);
  }

  const out: Array<string | { __highlight: true; text: string }> = [];
  let cursor = 0;
  for (const rr of merged) {
    if (rr.start > cursor) out.push(input.slice(cursor, rr.start));
    out.push({ __highlight: true, text: input.slice(rr.start, rr.end) });
    cursor = rr.end;
  }
  if (cursor < input.length) out.push(input.slice(cursor));
  return out;
}

interface ContentDetailProps {
  content: SourceContent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseForGeneration?: (content: SourceContent) => void;
  /**
   * Optional snippet strings to highlight inside the displayed body.
   * Intended for EchoWrite “Used in this output” evidence.
   */
  highlightSnippets?: string[];
}

export function ContentDetail({
  content,
  open,
  onOpenChange,
  onUseForGeneration,
  highlightSnippets,
}: ContentDetailProps) {
  const [copied, setCopied] = useState(false);

  const displayBodyText = useMemo(() => {
    const raw = String(content?.body || '');
    // Many sources store body as XML (sometimes entity-encoded XML).
    // Normalize it into readable text for display.
    return normalizeXmlToTextBrowser(raw);
  }, [content?.body]);

  const paragraphs = useMemo(() => {
    return displayBodyText
      .split(/\n\n+/g)
      .map((p) => p.trim())
      .filter(Boolean);
  }, [displayBodyText]);

  const highlightSnippetsClean = useMemo(() => {
    const list = (highlightSnippets || [])
      .map((s) => String(s || '').trim())
      .filter(Boolean)
      // Avoid highlighting tiny fragments.
      .filter((s) => s.length >= 10);

    // Dedupe while preserving order.
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of list) {
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
      if (out.length >= 20) break; // cap for perf
    }
    return out;
  }, [highlightSnippets]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayBodyText || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast({
      title: 'URL copied',
      description: 'The image link was copied to your clipboard.',
    });
  };

  if (!content) return null;

  const meta = parseMetadata(content);
  const selectedProperties = meta?.extraPropertiesSelected || {};
  const thumbnailUrl = getThumbnailUrl(content);
  const isFinraApproved = String(selectedProperties?.FinraApproved ?? '').toLowerCase() === 'true';
  const sourceDetails = [
    { label: 'External ID', value: content.externalId || 'Unavailable' },
    { label: 'Filename', value: selectedProperties?.BasContentFilename },
    { label: 'Content ID', value: selectedProperties?.BasContentId },
    { label: 'Format', value: selectedProperties?.Format },
    { label: 'FINRA letter', value: selectedProperties?.FinraLetterUrl },
    { label: 'Evergreen', value: selectedProperties?.Evergreen },
    { label: 'Categories', value: meta?.categories },
    { label: 'Sub-categories', value: meta?.subCategories },
  ];
  const extraProperties = Object.entries((meta?.extraProperties || {}) as Record<string, any>);

  const renderMetadataValue = (value: unknown) => {
    const text = metadataValue(value);

    if (!isUrlValue(text)) {
      return text;
    }

    return (
      <div className="flex min-w-0 items-center gap-2">
        <a
          href={text}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate text-primary underline-offset-2 hover:underline"
          title={text}
        >
          {text}
        </a>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Copy URL"
          title="Copy URL"
          onClick={() => handleCopyUrl(text)}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[86vh] max-h-[92vh] w-[92vw] max-w-[92vw] flex-col overflow-hidden rounded-lg border-border bg-background p-0 sm:max-w-[92vw]">
        <div className="grid min-h-0 flex-1 overflow-hidden grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex min-w-0 flex-col overflow-hidden">
            <DialogHeader className="border-b border-border px-6 py-5 text-left">
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg border border-border bg-gradient-to-br from-primary/18 via-info/8 to-secondary md:w-48">
                  {thumbnailUrl ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url("${thumbnailUrl.replace(/"/g, '\\"')}")` }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-primary/45">
                      <FileText className="h-9 w-9" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/15 via-transparent to-transparent" />
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {content.type ? (
                      <Badge
                        variant="outline"
                        className={cn('text-[11px] font-medium', designationToneClass(content.type))}
                      >
                        {content.type}
                      </Badge>
                    ) : null}
                    {isFinraApproved ? (
                      <Badge className="bg-primary text-[10px] text-primary-foreground hover:bg-primary">
                        FINRA reviewed
                      </Badge>
                    ) : null}
                  </div>

                  <div>
                    <DialogTitle className="text-xl leading-tight text-foreground">
                      {content.title}
                    </DialogTitle>
                    <DialogDescription className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-1 text-primary">
                        <User className="h-3.5 w-3.5" />
                        {getPublisherLabel(content)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {content.publishedAt ? format(new Date(content.publishedAt), 'MMM d, yyyy') : 'Published date unavailable'}
                      </span>
                    </DialogDescription>
                  </div>

                  {content.tags.length ? (
                    <div className="flex max-h-14 flex-wrap gap-1.5 overflow-hidden">
                      {content.tags.slice(0, 8).map((tag) => (
                        <Badge key={tag} variant="outline" className="bg-background/70 text-xs font-normal">
                          {tag}
                        </Badge>
                      ))}
                      {content.tags.length > 8 ? (
                        <Badge variant="outline" className="bg-background/70 text-xs font-normal">
                          +{content.tags.length - 8}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </DialogHeader>

            {highlightSnippetsClean.length ? (
              <div className="border-b border-border px-6 py-4">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="text-xs font-semibold text-foreground">Used in this output</div>
                  <div className="mt-2 space-y-2">
                    {highlightSnippetsClean.slice(0, 3).map((s, i) => (
                      <div
                        key={i}
                        className="rounded-md bg-background px-2 py-1 text-xs leading-relaxed text-foreground ring-1 ring-primary/20"
                      >
                        "{s}"
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Best-effort evidence from EchoWrite matching; excerpts may be paraphrased.
                  </div>
                </div>
              </div>
            ) : null}

            <ScrollArea className="min-h-0 flex-1">
              <div className="px-6 py-5">
	                <div className="max-w-none space-y-4 break-words text-sm leading-6 text-foreground/90">
	                  {paragraphs.map((paragraph, index) => (
	                    <p key={index}>
	                      {highlightText(paragraph, highlightSnippetsClean).map((part, partIndex) => {
	                        if (typeof part === 'string') return <span key={partIndex}>{part}</span>;
	                        return (
	                          <mark
	                            key={partIndex}
	                            className="rounded bg-primary/15 px-0.5 text-foreground ring-1 ring-primary/20"
	                          >
	                            {part.text}
	                          </mark>
	                        );
	                      })}
	                    </p>
	                  ))}
	                </div>
              </div>
            </ScrollArea>
          </div>

          <aside className="flex min-h-0 flex-col border-t border-border bg-muted/25 lg:border-l lg:border-t-0">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">Source details</h3>
              <p className="mt-1 text-xs text-muted-foreground">Provider metadata and approval signals.</p>
            </div>

            <ScrollArea className="min-h-0 flex-1 overflow-hidden">
              <div className="space-y-5 px-5 py-4">
                <div className="space-y-2">
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Designation</div>
                    <div className="mt-1 break-words text-sm font-semibold text-foreground">
                      {meta?.contentDesignation || content.type || 'n/a'}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">FINRA</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">
                          {isFinraApproved ? 'Reviewed' : 'Not reviewed'}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                          isFinraApproved ? 'bg-success/15 text-success' : 'bg-destructive/10 text-destructive'
                        )}
                        title={isFinraApproved ? 'FINRA reviewed' : 'Not FINRA reviewed'}
                      >
                        {isFinraApproved ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {sourceDetails.map((item) => (
                    <div key={item.label} className="min-w-0 rounded-md border border-border bg-background px-3 py-2">
                      <div className="text-[11px] font-medium text-muted-foreground">{item.label}</div>
                      <div className="mt-1 break-words text-xs leading-5 text-foreground">
                        {renderMetadataValue(item.value)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4">
                  <div className="mb-2 text-xs font-semibold text-foreground">Extra properties</div>
                  {extraProperties.length ? (
                    <div className="space-y-2">
                      {extraProperties.map(([key, value]) => (
                        <div key={key} className="min-w-0 rounded-md bg-background px-3 py-2 text-xs leading-5">
                          <div className="font-medium text-muted-foreground">{key}</div>
                          <div className="mt-0.5 break-words text-foreground">{renderMetadataValue(value)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border bg-background px-3 py-3 text-xs text-muted-foreground">
                      No extra properties available.
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </aside>
        </div>

        <Separator />

        <div className="flex shrink-0 flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy Text
                </>
              )}
            </Button>
            {content.url && (
              <Button variant="outline" size="sm" asChild>
                <a href={content.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Source
                </a>
              </Button>
            )}
          </div>
          {onUseForGeneration && (
            <Button
              className="sm:ml-auto"
              onClick={() => {
                onUseForGeneration(content);
                onOpenChange(false);
              }}
            >
              Use for Generation
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
