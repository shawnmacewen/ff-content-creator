'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CONTENT_TYPE_MAP } from '@/lib/content-config';
import type { ContentType, ContentStatus } from '@/lib/types/content';
import { Copy, Check, Save, RefreshCw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

interface GenerationPreviewProps {
  contentType: ContentType | null;
  content: string;
  isGenerating: boolean;
  onContentChange: (content: string) => void;
  onRegenerate: () => void;
  onSave: (status: ContentStatus) => void;
  compliance?: { grade?: string; confidence?: number; findings?: string[]; sectionScores?: Array<{ label: string; grade: string; confidence: number; findings: string[] }> } | null;
}

export function GenerationPreview({
  contentType,
  content,
  isGenerating,
  onContentChange,
  onRegenerate,
  onSave,
  compliance,
}: GenerationPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const typeInfo = contentType ? CONTENT_TYPE_MAP[contentType] : null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sections = useMemo(() => {
    const lines = content.split('\n');
    const out: Array<{ title: string; body: string }> = [];
    let currentTitle: string | null = null;
    let currentBody: string[] = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentTitle) out.push({ title: currentTitle, body: currentBody.join('\n').trim() });
        currentTitle = line.replace(/^##\s+/, '').trim();
        currentBody = [];
      } else {
        currentBody.push(line);
      }
    }

    if (currentTitle) out.push({ title: currentTitle, body: currentBody.join('\n').trim() });
    return out.filter((s) => s.title && s.body);
  }, [content]);

  const handleCopySection = async (title: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(title);
    setTimeout(() => setCopiedSection((prev) => (prev === title ? null : prev)), 2000);
  };

  const handleSectionChange = (title: string, nextBody: string) => {
    const updated = sections.map((s) => (s.title === title ? { ...s, body: nextBody } : s));
    const recomposed = updated.map((s) => `## ${s.title}\n\n${s.body.trim()}`).join('\n\n---\n\n');
    onContentChange(recomposed);
  };

  const characterCount = content.length;
  const maxLength = typeInfo?.maxLength;
  const isOverLimit = maxLength ? characterCount > maxLength : false;

  if (!contentType) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
          <CardDescription>Select a content type to begin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground">
              Your generated content will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              Preview
              {isGenerating && (
                <Badge variant="secondary" className="animate-pulse">
                  Generating...
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 flex-wrap">
              <span>{typeInfo?.label || contentType}</span>
              {compliance?.grade && (
                <Badge variant={compliance.grade === 'A' || compliance.grade === 'B' ? 'secondary' : compliance.grade === 'C' ? 'outline' : 'destructive'}>
                  Compliance Confidence: {compliance.grade} ({Math.round((compliance.confidence || 0) * 100)}%)
                </Badge>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {content && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={isGenerating}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRegenerate}
                  disabled={isGenerating}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              </>
            )}
          </div>
        </div>

      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <Textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="min-h-[300px] font-mono text-sm bg-muted/50"
            placeholder="Generated content will appear here..."
          />
        ) : sections.length > 1 ? (
          <ScrollArea className="h-[420px] rounded-lg border border-border bg-muted/30 p-4">
            <div className="space-y-4">
              {sections.map((section) => (
                <div key={section.title} className="rounded border bg-background/60 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{section.title}</div>
                    <Button variant="outline" size="sm" onClick={() => handleCopySection(section.title, section.body)}>
                      {copiedSection === section.title ? (
                        <><Check className="h-4 w-4 mr-1" />Copied</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-1" />Copy {section.title}</>
                      )}
                    </Button>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={section.body}
                      onChange={(e) => handleSectionChange(section.title, e.target.value)}
                      className="min-h-[140px] font-mono text-sm bg-background"
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{section.body}</div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="h-[300px] rounded-lg border border-border bg-muted/30 p-4">
            {content ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {isGenerating ? 'Generating content...' : 'Click "Generate" to create content'}
              </div>
            )}
          </ScrollArea>
        )}

        {compliance?.findings?.length ? (
          <div className="text-xs rounded border border-amber-500/30 bg-amber-500/10 p-2 text-amber-100">
            Potential compliance flags: {compliance.findings.join('; ')}
          </div>
        ) : null}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className={isOverLimit ? 'text-destructive' : ''}>
              {characterCount} characters
              {maxLength && ` / ${maxLength} max`}
            </span>
            {isOverLimit && (
              <Badge variant="destructive" className="text-xs">
                Over limit
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            disabled={!content}
          >
            {isEditing ? 'Preview' : 'Edit'}
          </Button>
        </div>

        {content && !isGenerating && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSave('draft')}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-1" />
              Save as Draft
            </Button>
            <Button
              size="sm"
              onClick={() => onSave('review')}
              className="flex-1"
            >
              Save for Review
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
