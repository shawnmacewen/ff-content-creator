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
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl leading-tight">
                {content.title}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className={content.sourceSystem === 'advisorstream' ? 'text-blue-500' : content.sourceSystem === 'sample-seed' ? 'text-green-500' : 'text-blue-500'}>
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
              <Badge variant="secondary">{content.type}</Badge>
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

        <Separator className="my-4" />

        <ScrollArea className="h-[300px] pr-4">
          <div className="prose prose-sm prose-invert max-w-none break-words overflow-x-hidden">
            {content.body.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-sm text-foreground/90 mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        </ScrollArea>

        <Separator className="my-4" />

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
