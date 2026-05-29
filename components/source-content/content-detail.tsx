'use client';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { overflowLabelClass, tagLabelClass } from '@/lib/content-label-colors';
import type { SourceContent } from '@/lib/types/content';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Bookmark,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Sparkles,
  TrendingUp,
  User,
  Users,
  WandSparkles,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type RichBlock =
  | { type: 'heading'; text: string; level: 2 | 3 }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; rows: string[][] };

const tableTags = ['table', 'informaltable', 'tgroup', 'thead', 'tbody'];
const rowTags = ['tr', 'row', 'table_row', 'tablerow'];
const cellTags = ['th', 'td', 'cell', 'entry', 'table_cell', 'tablecell'];
const unorderedListTags = ['ul', 'unordered_list', 'bullet_list', 'bullets', 'itemizedlist'];
const orderedListTags = ['ol', 'ordered_list', 'numbered_list', 'orderedlist'];
const listItemTags = ['li', 'item', 'list_item', 'listitem', 'bullet'];

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

function nodeText(node: Node | null | undefined): string {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function hasElementChildren(node: Element) {
  return Array.from(node.childNodes).some((child) => child.nodeType === Node.ELEMENT_NODE);
}

function parseTableNode(node: Element): RichBlock | null {
  const rowSelector = rowTags.join(',');
  const cellSelector = cellTags.join(',');
  const rowNodes = Array.from(node.querySelectorAll(rowSelector));
  const rows = rowNodes
    .map((row) => {
      const cells = Array.from(row.querySelectorAll(cellSelector))
        .map((cell) => nodeText(cell))
        .filter(Boolean);
      return cells;
    })
    .filter((row) => row.length);

  return rows.length ? { type: 'table', rows } : null;
}

function parseListNode(node: Element, ordered: boolean): RichBlock | null {
  const directItems = Array.from(node.children)
    .filter((child) => listItemTags.includes(child.tagName.toLowerCase()))
    .map((child) => nodeText(child))
    .filter(Boolean);

  return directItems.length ? { type: 'list', ordered, items: directItems } : null;
}

function pushTextBlock(blocks: RichBlock[], type: RichBlock['type'], text: string, level: 2 | 3 = 2) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return;
  if (type === 'heading') blocks.push({ type, text: clean, level });
  else if (type === 'paragraph') blocks.push({ type, text: clean });
}

function walkRichNode(node: Element, blocks: RichBlock[]) {
  const tag = node.tagName.toLowerCase();

  if (['document_title', 'title', 'h1', 'h2'].includes(tag)) {
    pushTextBlock(blocks, 'heading', nodeText(node), 2);
    return;
  }

  if (['short_title', 'subtitle', 'subhead', 'h3'].includes(tag)) {
    pushTextBlock(blocks, 'heading', nodeText(node), 3);
    return;
  }

  if (['paragraph', 'para', 'p', 'simpara'].includes(tag)) {
    pushTextBlock(blocks, 'paragraph', nodeText(node));
    return;
  }

  if (unorderedListTags.includes(tag)) {
    const parsed = parseListNode(node, false);
    if (parsed) blocks.push(parsed);
    return;
  }

  if (orderedListTags.includes(tag)) {
    const parsed = parseListNode(node, true);
    if (parsed) blocks.push(parsed);
    return;
  }

  if (tableTags.includes(tag)) {
    const parsed = parseTableNode(node);
    if (parsed) blocks.push(parsed);
    return;
  }

  if (!hasElementChildren(node)) {
    pushTextBlock(blocks, 'paragraph', nodeText(node));
    return;
  }

  Array.from(node.children).forEach((child) => walkRichNode(child, blocks));
}

function plainTextBlocks(input: string): RichBlock[] {
  const text = normalizeXmlToTextBrowser(input);
  const marketBlocks = parseMarketDataTableBlocks(text);
  if (marketBlocks) return marketBlocks;

  return text
    .split(/\n\n+/g)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ type: 'paragraph', text }) as RichBlock);
}

function parseMarketDataTableBlocks(input: string): RichBlock[] | null {
  const text = input.replace(/\r/g, '').trim();
  const labels = [
    'Dow Jones Industrial Average',
    'NASDAQ',
    'S&P 500',
    'Russell 2000',
    'Global Dow',
    'fed. funds target rate',
    '10-year Treasuries',
    'US Dollar-DXY',
    'Crude Oil-CL=F',
    'Gold-GC=F',
  ];

  const foundLabels = labels.filter((label) => new RegExp(`\\b${escapeRegex(label)}\\b`, 'i').test(text));
  if (foundLabels.length < 4) return null;

  const noteStart = text.search(/Chart reflects/i);
  const tableText = noteStart >= 0 ? text.slice(0, noteStart) : text;
  const note = noteStart >= 0 ? text.slice(noteStart).trim() : '';

  const labelPattern = new RegExp(`\\b(${labels.map(escapeRegex).join('|')})\\b`, 'gi');
  const matches = Array.from(tableText.matchAll(labelPattern));
  if (matches.length < 4) return null;

  const rows = matches
    .map((match, index) => {
      const start = match.index ?? 0;
      const end = matches[index + 1]?.index ?? tableText.length;
      const segment = tableText.slice(start, end).replace(/\s+/g, ' ').trim();
      const label = match[1];
      const values = segment
        .slice(label.length)
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      return [label, ...values];
    })
    .filter((row) => row.length >= 4);

  if (rows.length < 4) return null;

  const intro = tableText.slice(0, matches[0].index ?? 0).trim();
  const showIntro = intro && !/^[\d.,%$ -]+$/.test(intro);

  return [
    ...(showIntro ? [{ type: 'paragraph' as const, text: intro }] : []),
    {
      type: 'table' as const,
      rows: [
        ['Market', 'Prior', 'Recent', 'Current', 'Change', 'YTD'],
        ...rows,
      ],
    },
    ...(note ? [{ type: 'paragraph' as const, text: note }] : []),
  ];
}

function richBlocksFromChildren(parent: Element): RichBlock[] {
  const blocks: RichBlock[] = [];
  Array.from(parent.children).forEach((child) => walkRichNode(child, blocks));
  return blocks;
}

function parseRichBody(input: string): RichBlock[] {
  const decoded = decodeEntitiesBrowser(String(input || ''));
  if (!decoded.trim()) return [];

  const looksStructured = /<\/?[a-z][\s\S]*>/i.test(decoded);
  if (!looksStructured) {
    return plainTextBlocks(decoded);
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<root>${decoded}</root>`, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML parser error');

    const blocks = richBlocksFromChildren(doc.documentElement);
    return blocks.length ? blocks : plainTextBlocks(decoded);
  } catch {
    const parser = new DOMParser();
    const doc = parser.parseFromString(decoded, 'text/html');
    const blocks = doc.body ? richBlocksFromChildren(doc.body) : [];
    return blocks.length ? blocks : plainTextBlocks(decoded);
  }
}

function getRenderableBody(content: SourceContent | null): string {
  if (!content) return '';
  return String(content.bodyXml || content.body || '');
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

  const richBlocks = useMemo(() => parseRichBody(getRenderableBody(content)), [content]);

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
  const publisherLabel = getPublisherLabel(content);
  const publishedDate = content.publishedAt ? format(new Date(content.publishedAt), 'MMM d, yyyy') : 'Published date unavailable';
  const designation = meta?.contentDesignation || content.type || 'Editorial Source';
  const bodyParagraphs = richBlocks.filter((block): block is Extract<RichBlock, { type: 'paragraph' }> => block.type === 'paragraph');
  const takeawaySource = [
    content.excerpt,
    ...bodyParagraphs.map((block) => block.text),
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const takeaways = takeawaySource
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 42)
    .slice(0, 3);
  const resolvedTakeaways = takeaways.length
    ? takeaways
    : [
        `${content.title} is available as an approved source for content generation.`,
        'Review the article body and metadata before using it as campaign source material.',
        'Use the source actions to copy text, open the original, or send the article into generation.',
      ];
  const visibleBlocks = richBlocks.length ? richBlocks : plainTextBlocks(displayBodyText);

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

  const renderHighlightedText = (text: string) => {
    return highlightText(text, highlightSnippetsClean).map((part, partIndex) => {
      if (typeof part === 'string') return <span key={partIndex}>{part}</span>;
      return (
        <mark
          key={partIndex}
          className="rounded bg-primary/15 px-0.5 text-foreground ring-1 ring-primary/20"
        >
          {part.text}
        </mark>
      );
    });
  };

  const renderRichBlock = (block: RichBlock, index: number) => {
    if (block.type === 'heading') {
      const HeadingTag = block.level === 2 ? 'h2' : 'h3';
      return (
        <HeadingTag
          key={index}
          className={cn(
            'font-semibold leading-tight text-foreground',
            block.level === 2 ? 'text-lg' : 'text-base',
          )}
        >
          {renderHighlightedText(block.text)}
        </HeadingTag>
      );
    }

    if (block.type === 'paragraph') {
      return <p key={index}>{renderHighlightedText(block.text)}</p>;
    }

    if (block.type === 'list') {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag
          key={index}
          className={cn('space-y-1 pl-5', block.ordered ? 'list-decimal' : 'list-disc')}
        >
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderHighlightedText(item)}</li>
          ))}
        </ListTag>
      );
    }

    return (
      <div key={index} className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[520px] border-collapse text-left text-xs">
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={
                  rowIndex === 0 ? 'bg-muted/50 font-medium text-foreground' : 'border-t border-border'
                }
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border-r border-border px-3 py-2 align-top last:border-r-0"
                  >
                    {renderHighlightedText(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[90vh] max-h-[94vh] w-[94vw] max-w-[1180px] overflow-hidden rounded-[2rem] border-0 bg-white p-0 shadow-[0_32px_110px_rgba(15,23,42,0.28)] sm:max-w-[1180px]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{publisherLabel} source article preview</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-full bg-[radial-gradient(circle_at_8%_18%,rgba(125,211,252,0.18),transparent_32%),radial-gradient(circle_at_92%_78%,rgba(167,139,250,0.18),transparent_34%),linear-gradient(180deg,#f8fafc,#ffffff_42%)]">
          <section className="group relative isolate min-h-[38vh] overflow-hidden bg-slate-950">
            {thumbnailUrl ? (
              <div
                className="absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
                style={{ backgroundImage: `url("${thumbnailUrl.replace(/"/g, '\\"')}")` }}
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(147,197,253,0.42),transparent_30%),linear-gradient(135deg,#071326,#19356a_52%,#0f172a)]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.92),rgba(15,23,42,0.62)_42%,rgba(15,23,42,0.14)),linear-gradient(0deg,rgba(2,6,23,0.8),transparent_48%)]" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent" />
            <div className="pointer-events-none absolute -left-20 bottom-10 h-56 w-56 rounded-full bg-sky-300/20 blur-3xl" />
            <div className="pointer-events-none absolute right-10 top-20 h-48 w-48 rounded-full bg-violet-300/20 blur-3xl" />

            <div className="absolute right-5 top-5 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white shadow-lg shadow-black/20 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20"
                title="Copy article text"
              >
                {copied ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {copied ? 'Copied' : 'Save'}
              </button>
              {content.url ? (
                <a
                  href={content.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white shadow-lg shadow-black/20 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-black/50"
                  title="View source"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </a>
              ) : (
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/25 text-white/70 shadow-lg shadow-black/20 backdrop-blur-md">
                  <MoreHorizontal className="h-5 w-5" />
                </span>
              )}
              <DialogClose className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-white">
                <X className="h-5 w-5" />
                <span className="sr-only">Close article preview</span>
              </DialogClose>
            </div>

            <div className="relative z-10 flex min-h-[32vh] flex-col justify-end px-7 pb-9 pt-20 text-white sm:px-10 lg:px-12">
              <div className="mb-5 inline-flex w-fit items-center rounded-full border border-cyan-200/30 bg-cyan-300/10 px-4 py-1.5 text-xs font-semibold text-cyan-100 shadow-lg shadow-cyan-950/20 backdrop-blur">
                {designation}
              </div>
              <h2 className="max-w-4xl text-balance font-serif text-3xl font-semibold leading-[1.08] tracking-normal text-white drop-shadow-2xl sm:text-4xl lg:text-5xl">
                {content.title}
              </h2>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-white/82">
                <span className="inline-flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {publisherLabel}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {publishedDate}
                </span>
                {isFinraApproved ? <span>FINRA reviewed</span> : null}
              </div>
            </div>
          </section>

          {highlightSnippetsClean.length ? (
            <div className="mx-auto max-w-6xl px-7 pt-8 sm:px-10 lg:px-12">
              <div className="rounded-2xl border border-primary/15 bg-white/72 p-4 shadow-[0_18px_60px_rgba(37,99,235,0.10)] backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">Used in this output</div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {highlightSnippetsClean.slice(0, 3).map((s, i) => (
                    <div key={i} className="rounded-xl bg-primary/5 px-3 py-2 text-xs leading-relaxed text-slate-700 ring-1 ring-primary/15">
                      "{s}"
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mx-auto grid max-w-6xl gap-7 px-7 pb-28 pt-8 sm:px-10 md:grid-cols-[0.62fr_1.38fr] lg:px-12">
            <aside className="space-y-8">
              <div className="space-y-5">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-950">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Key Takeaways
                </div>
                <div className="space-y-6">
                  {resolvedTakeaways.map((item, index) => {
                    const Icon = index === 0 ? TrendingUp : index === 1 ? Users : WandSparkles;
                    return (
                      <div key={index} className="grid grid-cols-[52px_minmax(0,1fr)] gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.16),0_10px_30px_rgba(6,182,212,0.12)]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="line-clamp-4 pt-1 text-[13px] font-medium leading-5 text-slate-700">{renderHighlightedText(item)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-200/80 pt-6">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Source Signals</div>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
                    <span>Designation</span>
                    <span className="text-right font-semibold text-slate-950">{designation}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
                    <span>Approval</span>
                    <span className="font-semibold text-slate-950">{isFinraApproved ? 'FINRA reviewed' : 'Not reviewed'}</span>
                  </div>
                  {sourceDetails.slice(0, 4).map((item) => (
                    <div key={item.label} className="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-3">
                      <span>{item.label}</span>
                      <div className="max-w-[58%] text-right text-xs font-medium leading-5 text-slate-700">{renderMetadataValue(item.value)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {content.tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {content.tags.slice(0, 8).map((tag) => (
                    <Badge key={tag} variant="outline" className={cn('rounded-full text-xs font-normal', tagLabelClass(tag))}>
                      {tag}
                    </Badge>
                  ))}
                  {content.tags.length > 8 ? (
                    <Badge variant="outline" className={cn('rounded-full text-xs font-normal', overflowLabelClass())}>
                      +{content.tags.length - 8}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </aside>

            <article className="border-slate-200/80 md:border-l md:pl-10">
              <div className="space-y-5 break-words text-sm leading-7 text-slate-700">
                {visibleBlocks.map((block, index) => (
                  <div
                    key={index}
                    className={cn(
                      block.type === 'paragraph' && index === 0
                        ? '[&>p]:first-letter:float-left [&>p]:first-letter:mr-3 [&>p]:first-letter:font-serif [&>p]:first-letter:text-5xl [&>p]:first-letter:leading-[0.86] [&>p]:first-letter:text-slate-950'
                        : ''
                    )}
                  >
                    {renderRichBlock(block, index)}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </ScrollArea>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-5 pb-5">
          <div className="pointer-events-auto flex w-full max-w-4xl flex-col gap-3 rounded-3xl border border-white/20 bg-slate-950/88 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="h-11 rounded-2xl border-white/15 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white" onClick={handleCopy}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? 'Copied' : 'Copy Text'}
              </Button>
              {content.url ? (
                <Button variant="outline" className="h-11 rounded-2xl border-white/15 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white" asChild>
                  <a href={content.url} target="_blank" rel="noopener noreferrer">
                    View Source
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              ) : null}
            </div>
            {onUseForGeneration ? (
              <Button
                className="h-11 rounded-2xl bg-[linear-gradient(135deg,#5b8cff,#9b4dff)] px-7 font-semibold text-white shadow-[0_0_28px_rgba(99,102,241,0.42)] transition hover:-translate-y-0.5 hover:shadow-[0_0_38px_rgba(139,92,246,0.56)]"
                onClick={() => {
                  onUseForGeneration(content);
                  onOpenChange(false);
                }}
              >
                <WandSparkles className="mr-2 h-4 w-4" />
                Use This Article
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
