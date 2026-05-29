'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Copy, Sparkles } from 'lucide-react';
import type { ContentType } from '@/lib/types/content';
import { CONTENT_TYPE_MAP } from '@/lib/content-config';
import { cn } from '@/lib/utils';
import { PlatformOutputPreview } from '@/components/generator/platform-output-preview';

export type KitOutput = {
  type: ContentType;
  label?: string;
  content: string;
};

export function KitGeneratedOutput({
  selectedTypes,
  outputs,
  isGenerating,
  onGenerate,
  activeType,
  showTabs = true,
}: {
  selectedTypes: ContentType[];
  outputs?: KitOutput[] | null;
  isGenerating?: boolean;
  onGenerate?: () => void;
  /** When provided, render only this type (or 'all') and do not manage internal tabs. */
  activeType?: ContentType | 'all';
  /** Show/hide the internal per-type tab strip. */
  showTabs?: boolean;
}) {
  const types = React.useMemo(
    () => (selectedTypes.length ? selectedTypes : (['social-instagram'] as ContentType[])),
    [selectedTypes]
  );
  const [activeInternal, setActiveInternal] = React.useState<ContentType>(types[0]);
  const [copiedType, setCopiedType] = React.useState<ContentType | null>(null);

  React.useEffect(() => {
    if (!types.includes(activeInternal)) setActiveInternal(types[0]);
  }, [types, activeInternal]);

  const hasAnyOutput = !!outputs?.some((o) => o.content && o.content.trim().length > 0);
  const effectiveActive = activeType === 'all' ? 'all' : (activeType ?? activeInternal);

  const copyOutput = async (type: ContentType, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedType(type);
    window.setTimeout(() => setCopiedType((prev) => (prev === type ? null : prev)), 2000);
  };

  const renderOutput = (type: ContentType) => {
    const out = outputs?.find((o) => o.type === type);
    const txt = out?.content || '';
    const label = out?.label || CONTENT_TYPE_MAP[type]?.label || type;

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">{label}</div>
            <div className="text-xs text-muted-foreground">Previewed in the channel format a reader would see.</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!txt}
            onClick={() => copyOutput(type, txt)}
          >
            {copiedType === type ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedType === type ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <div className="rounded-2xl border bg-muted/20 p-3 sm:p-5">
          <PlatformOutputPreview type={type} label={label} content={txt} />
        </div>
      </div>
    );
  };

  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardContent className="space-y-4 pt-6">
        {onGenerate ? (
          <div className="flex justify-end">
            <Button
              size="sm"
              className="rounded-2xl bg-primary hover:bg-primary/90"
              onClick={onGenerate}
              disabled={!!isGenerating}
            >
              {isGenerating ? 'Generating…' : 'Generate'}
            </Button>
          </div>
        ) : null}

        {showTabs && effectiveActive !== 'all' ? (
          <Tabs value={effectiveActive} onValueChange={(v) => setActiveInternal(v as ContentType)} className="w-full">
            <TabsList className={cn('w-full justify-start', types.length > 3 && 'flex-wrap h-auto')}>
              {types.map((t) => (
                <TabsTrigger key={t} value={t} className="rounded-2xl">
                  {CONTENT_TYPE_MAP[t]?.label ?? t}
                </TabsTrigger>
              ))}
            </TabsList>

            {types.map((t) => {
              return (
                <TabsContent key={t} value={t} className="mt-4">
                  {!hasAnyOutput ? (
                    <div className="rounded-2xl border bg-muted/20 p-6 text-sm text-muted-foreground">
                      Generated output will appear here after you click Generate.
                    </div>
                  ) : (
                    renderOutput(t)
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          <div className="w-full">
            {!hasAnyOutput ? (
              <div className="rounded-2xl border bg-muted/20 p-6 text-sm text-muted-foreground">
                Generated output will appear here after you click Generate.
              </div>
            ) : effectiveActive === 'all' ? (
              <div className="space-y-3">
                {types.map((t) => {
                  return (
                    <div key={t} className="rounded-2xl border bg-background p-4 shadow-sm">
                      {renderOutput(t)}
                    </div>
                  );
                })}
              </div>
            ) : (
              (() => {
                return renderOutput(effectiveActive);
              })()
            )}
          </div>
        )}

        <div className="rounded-2xl border bg-primary/10 px-4 py-3 text-xs text-primary">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>AI-generated content. Review and edit before posting.</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
