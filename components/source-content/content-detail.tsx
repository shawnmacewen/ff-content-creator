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
import type { SourceContent } from '@/lib/types/content';
import { format } from 'date-fns';
import { ExternalLink, User, Calendar, Copy, Check } from 'lucide-react';
import { useState } from 'react';

const designationColorClasses = [
  'bg-blue-500/12 text-foreground border-border',
  'bg-emerald-500/12 text-foreground border-border',
  'bg-violet-500/12 text-foreground border-border',
  'bg-amber-500/12 text-foreground border-border',
  'bg-rose-500/12 text-foreground border-border',
  'bg-cyan-500/12 text-foreground border-border',
  'bg-lime-500/12 text-foreground border-border',
  'bg-fuchsia-500/12 text-foreground border-border',
];

function designationColorClass(value?: string | null) {
  const text = String(value || 'unknown');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return designationColorClasses[hash % designationColorClasses.length];
}

interface ContentDetailProps {
  content: SourceContent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseForGeneration?: (content: SourceContent) => void;
}

export function ContentDetail({
  content,
  open,
  onOpenChange,
  onUseForGeneration,
}: ContentDetailProps) {
  const [copied, setCopied] = useState(false);

  if (!content) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[84vw] w-[84vw] sm:max-w-[84vw] h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl leading-tight">
                {content.title}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className={content.publisher === 'publisher-content' ? 'text-purple-500' : content.sourceSystem === 'advisorstream' ? 'text-blue-500' : content.sourceSystem === 'sample-seed' ? 'text-green-500' : 'text-blue-500'}>
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
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {content.publishedAt ? format(new Date(content.publishedAt), 'MMM d, yyyy') : 'Published date unavailable'}
                </span>
              </DialogDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline" className={designationColorClass(content.type)}>{content.type}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {content.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <Separator className="my-3" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          <div className="lg:col-span-2 min-h-0">
            <ScrollArea className="h-full pr-4">
              <div className="prose prose-sm prose-invert max-w-none break-words overflow-x-hidden">
                {content.body.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="text-sm text-foreground/90 mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="lg:col-span-1 rounded-md border p-3 min-h-0">
            <h3 className="text-sm font-semibold mb-3">Metadata</h3>
            <ScrollArea className="h-full pr-2">
              <div className="space-y-2 text-xs">
                <div><span className="text-muted-foreground">External ID:</span> {content.externalId || 'Unavailable'}</div>
                <div><span className="text-muted-foreground">BasContentId:</span> {content.metadata?.extraPropertiesSelected?.BasContentId || 'n/a'}</div>
                <div><span className="text-muted-foreground">BasContentFilename:</span> {content.metadata?.extraPropertiesSelected?.BasContentFilename || 'n/a'}</div>
                <div><span className="text-muted-foreground">Format:</span> {content.metadata?.extraPropertiesSelected?.Format || 'n/a'}</div>
                <div><span className="text-muted-foreground">FinraLetterUrl:</span> {content.metadata?.extraPropertiesSelected?.FinraLetterUrl || 'n/a'}</div>
                <div><span className="text-muted-foreground">FinraApproved:</span> {String(content.metadata?.extraPropertiesSelected?.FinraApproved ?? 'n/a')}</div>
                <div><span className="text-muted-foreground">APContentType:</span> {content.metadata?.extraPropertiesSelected?.APContentType || 'n/a'}</div>
                <div><span className="text-muted-foreground">Evergreen:</span> {String(content.metadata?.extraPropertiesSelected?.Evergreen ?? 'n/a')}</div>
                <div><span className="text-muted-foreground">Content Designation:</span> {content.metadata?.contentDesignation || 'n/a'}</div>
                <div><span className="text-muted-foreground">Categories:</span> {Array.isArray(content.metadata?.categories) ? content.metadata.categories.join(', ') || 'n/a' : 'n/a'}</div>
                <div><span className="text-muted-foreground">Sub-categories:</span> {Array.isArray(content.metadata?.subCategories) ? content.metadata.subCategories.join(', ') || 'n/a' : 'n/a'}</div>

                <div className="pt-3 mt-3 border-t">
                  <div className="text-xs font-semibold mb-2">Extra Properties (variable)</div>
                  <div className="space-y-1">
                    {Object.entries(content.metadata?.extraProperties || {}).length ? (
                      Object.entries(content.metadata.extraProperties as Record<string, any>).map(([k, v]) => (
                        <div key={k} className="break-words">
                          <span className="text-muted-foreground">{k}:</span> {String(v ?? '') || 'n/a'}
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground">n/a</div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
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
