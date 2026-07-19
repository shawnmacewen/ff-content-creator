'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Check, Circle, Copy, Loader2, Sparkles } from 'lucide-react';
import type { ContentType } from '@/lib/types/content';
import { CONTENT_TYPE_MAP } from '@/lib/content-config';
import { cn } from '@/lib/utils';
import { PlatformOutputPreview } from '@/components/generator/platform-output-preview';

export type KitOutput = {
  type: ContentType;
  label?: string;
  content: string;
};

export type KitOutputStatus = 'idle' | 'generating' | 'complete' | 'failed';

export function KitGeneratedOutput({
  selectedTypes,
  outputs,
  isGenerating,
  onGenerate,
  activeType,
  showTabs = true,
  outputStatuses,
}: {
  selectedTypes: ContentType[];
  outputs?: KitOutput[] | null;
  isGenerating?: boolean;
  onGenerate?: () => void;
  /** When provided, render only this type (or 'all') and do not manage internal tabs. */
  activeType?: ContentType | 'all';
  /** Show/hide the internal per-type tab strip. */
  showTabs?: boolean;
  outputStatuses?: Partial<Record<ContentType, KitOutputStatus>>;
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

  const getStatus = (type: ContentType): KitOutputStatus => {
    if (outputStatuses?.[type]) return outputStatuses[type]!;
    if (outputs?.some((o) => o.type === type && o.content?.trim())) return 'complete';
    if (isGenerating) return 'generating';
    return 'idle';
  };

  const renderStatusIcon = (status: KitOutputStatus) => {
    if (status === 'complete') return <Check className="h-3.5 w-3.5 text-emerald-600" />;
    if (status === 'generating') return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
    if (status === 'failed') return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    return <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />;
  };

  const renderOutput = (type: ContentType) => {
    const out = outputs?.find((o) => o.type === type);
    const txt = out?.content || '';
    const label = out?.label || CONTENT_TYPE_MAP[type]?.label || type;
    const status = getStatus(type);
    const compactPreview = !showTabs;

    return (
      <div className="space-y-3">
        {compactPreview ? null : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              {renderStatusIcon(status)}
              <span>{label}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {status === 'generating'
                ? 'This output is still generating.'
                : status === 'complete'
                  ? 'Previewed in the channel format a reader would see.'
                  : status === 'failed'
                    ? 'This output did not complete. Try regenerating the kit.'
                    : 'Generated output will appear after generation runs.'}
            </div>
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
        )}
        {txt ? (
          <div className={compactPreview ? '' : 'rounded-2xl border bg-muted/20 p-3 sm:p-5'}>
            <PlatformOutputPreview type={type} label={label} content={txt} />
          </div>
        ) : (
          <div className="rounded-2xl border bg-muted/20 p-6 text-sm text-muted-foreground">
            {status === 'generating' ? 'Generating this output...' : 'No output has been generated for this type yet.'}
          </div>
        )}
      </div>
    );
  };

  const content = (
    <>
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
                {renderStatusIcon(getStatus(t))}
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
                  <div key={t} className={showTabs ? 'rounded-2xl border bg-background p-4 shadow-sm' : ''}>
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

      {showTabs ? (
        <div className="rounded-2xl border bg-primary/10 px-4 py-3 text-xs text-primary">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>AI-generated content. Review and edit before posting.</span>
          </div>
        </div>
      ) : null}
    </>
  );

  if (!showTabs) {
    return <div className="w-full">{content}</div>;
  }

  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardContent className="space-y-4 pt-6">
        {content}
      </CardContent>
    </Card>
  );
}
