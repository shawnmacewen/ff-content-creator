'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CONTENT_TYPE_MAP } from '@/lib/content-config';
import type { ContentTypeInfo } from '@/lib/types/content';
import type { ContentType, ContentStatus } from '@/lib/types/content';
import { Copy, Check, Save, RefreshCw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

interface GenerationPreviewProps {
  contentType: ContentType | null;
  previewLabel?: string | null;
  content: string;
  isGenerating: boolean;
  onContentChange: (content: string) => void;
  onRegenerate: () => void;
  onSave: (status: ContentStatus) => void;
  compliance?: { grade?: string; confidence?: number; findings?: string[]; sectionScores?: Array<{ label: string; grade: string; confidence: number; findings: string[] }> } | null;
  imageGenerationEnabled?: boolean;
  generatedImages?: Record<string, string>;
  imageStatus?: string | null;
}

export function GenerationPreview({
  contentType,
  previewLabel,
  content,
  isGenerating,
  onContentChange,
  onRegenerate,
  onSave,
  compliance,
  imageGenerationEnabled = false,
  generatedImages = {},
  imageStatus = null,
}: GenerationPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeView, setActiveView] = useState<'all' | string>('all');

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

  const sectionTypeByTitle: Record<string, keyof typeof CONTENT_TYPE_MAP> = {
    'LinkedIn Post': 'social-linkedin',
    'Instagram Caption': 'social-instagram',
    Email: 'email-marketing',
  };

  const sectionsWithMeta = sections.map((s) => {
    const contentTypeKey = sectionTypeByTitle[s.title] as keyof typeof CONTENT_TYPE_MAP | undefined;
    const info: ContentTypeInfo | undefined = contentTypeKey ? CONTENT_TYPE_MAP[contentTypeKey] : undefined;
    const length = s.body.length;
    const limit = info?.maxLength;
    const over = limit ? length > limit : false;
    return { ...s, info, length, limit, over };
  });

  const visibleSections = activeView === 'all'
    ? sectionsWithMeta
    : sectionsWithMeta.filter((s) => s.title === activeView);

  const getSectionImageSrc = (section: { title: string; body: string }) => {
    const imageLine = section.body.split('\n').find((line) => line.toLowerCase().startsWith('image url:'));
    const inlineImageSrc = imageLine ? imageLine.slice('Image URL:'.length).trim() : null;
    return section.title === 'Instagram Caption' ? (generatedImages.instagram || inlineImageSrc) : inlineImageSrc;
  };

  if (!contentType && !content && sections.length === 0) {
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
              <span>{previewLabel || typeInfo?.label || contentType || 'Generated content'}</span>
              {compliance?.grade && (
                <Badge variant={compliance.grade === 'A' || compliance.grade === 'B' ? 'secondary' : compliance.grade === 'C' ? 'outline' : 'destructive'}>
                  Compliance Confidence: {compliance.grade} ({Math.round((compliance.confidence || 0) * 100)}%)
                </Badge>
              )}
              <Badge variant="outline">
                Instagram Image: {imageGenerationEnabled ? 'On' : 'Off'}
              </Badge>
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
        ) : sections.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant={activeView === 'all' ? 'default' : 'outline'} onClick={() => setActiveView('all')}>All Outputs</Button>
              {sectionsWithMeta.map((section) => (
                <Button key={section.title} size="sm" variant={activeView === section.title ? 'default' : 'outline'} onClick={() => setActiveView(section.title)}>
                  {section.title}
                </Button>
              ))}
            </div>
            <ScrollArea className="h-[420px] rounded-lg border border-border bg-muted/30 p-4">
              <div className="space-y-4">
                {visibleSections.map((section) => (
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
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        {section.length} characters{section.limit ? ` / ${section.limit} max` : ''}
                        {section.over ? <span className="text-destructive ml-2">Over limit</span> : null}
                      </div>
                      {section.title === 'Instagram Caption' && imageGenerationEnabled ? (
                        <div className="text-amber-400">
                          Image present: {getSectionImageSrc(section) ? 'yes' : 'no'}
                          {!/Image URL:|Image generation status:/i.test(section.body) ? ' · missing from output (re-run generation with image setting enabled)' : ''}
                        </div>
                      ) : null}
                    </div>
                    {isEditing ? (
                      <Textarea
                        value={section.body}
                        onChange={(e) => handleSectionChange(section.title, e.target.value)}
                        className="min-h-[140px] font-mono text-sm bg-background"
                      />
                    ) : (
                      (() => {
                        const imageSrc = getSectionImageSrc(section);
                        const captionOnly = section.body
                          .replace(/\n*Image URL:\s*.*$/im, '')
                          .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\n\r]+/g, '[image-data]')
                          .trim();
                        if (section.title === 'Instagram Caption' && activeView !== 'all') {
                          return (
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="whitespace-pre-wrap text-sm leading-relaxed">{captionOnly}</div>
                              <div className="rounded border bg-muted/20 p-2 min-h-[180px] flex items-center justify-center">
                                {imageSrc ? <img src={imageSrc} alt="Generated Instagram" className="rounded border max-h-64" /> : <span className="text-xs text-muted-foreground">No image returned yet</span>}
                                {imageSrc?.startsWith('data:image/') ? (
                                  <div className="text-[10px] text-muted-foreground mt-1">Image source: inline base64 (rendered)</div>
                                ) : null}
                              </div>
                            </div>
                          );
                        }
                        return <div className="whitespace-pre-wrap text-sm leading-relaxed">{section.body}</div>;
                      })()
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <ScrollArea className="h-[300px] rounded-lg border border-border bg-muted/30 p-4">
            {content ? (
              (contentType === 'social-instagram' && imageGenerationEnabled) ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{content.replace(/\n*Image URL:\s*.*$/im, '').replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\n\r]+/g, '[image-data]').trim()}</div>
                  <div className="rounded border bg-muted/20 p-2 min-h-[180px] flex items-center justify-center">
                    {generatedImages.instagram ? <img src={generatedImages.instagram} alt="Generated Instagram" className="rounded border max-h-64" /> : <span className="text-xs text-muted-foreground">No image returned yet</span>}
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
              )
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {isGenerating ? 'Generating content...' : 'Click "Generate" to create content'}
              </div>
            )}
          </ScrollArea>
        )}

        {imageGenerationEnabled && imageStatus ? (
          <div className="text-xs rounded border border-blue-500/30 bg-blue-500/10 p-2 text-blue-100">
            Image generation: {imageStatus}
          </div>
        ) : null}

        {compliance?.findings?.length ? (
          <div className="text-xs rounded border border-amber-500/30 bg-amber-500/10 p-2 text-amber-100">
            Potential compliance flags: {compliance.findings.join('; ')}
          </div>
        ) : null}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {sections.length > 1 ? (
              <span>{characterCount} total characters across KIT outputs</span>
            ) : (
              <>
                <span className={isOverLimit ? 'text-destructive' : ''}>
                  {characterCount} characters
                  {maxLength && ` / ${maxLength} max`}
                </span>
                {isOverLimit && (
                  <Badge variant="destructive" className="text-xs">
                    Over limit
                  </Badge>
                )}
              </>
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
