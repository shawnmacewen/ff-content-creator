'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles } from 'lucide-react';
import type { ContentType } from '@/lib/types/content';
import { CONTENT_TYPE_MAP } from '@/lib/content-config';
import { cn } from '@/lib/utils';

export type KitOutput = {
  type: ContentType;
  label?: string;
  content: string;
};

// NOTE: No mock/default preview content. Keep output empty until generated.
const PREVIEW_MOCK: Record<string, string> = {};

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
  const types = selectedTypes.length ? selectedTypes : (['social-instagram'] as ContentType[]);
  const [activeInternal, setActiveInternal] = React.useState<ContentType>(types[0]);

  React.useEffect(() => {
    if (!types.includes(activeInternal)) setActiveInternal(types[0]);
  }, [types, activeInternal]);

  const hasAnyOutput = !!outputs?.some((o) => o.content && o.content.trim().length > 0);
  const effectiveActive = activeType === 'all' ? 'all' : (activeType ?? activeInternal);



  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Generated Output</CardTitle>
          <div className="flex items-center gap-2">
            {onGenerate ? (
              <Button
                size="sm"
                className="rounded-2xl bg-violet-600 hover:bg-violet-600/90"
                onClick={onGenerate}
                disabled={!!isGenerating}
              >
                {isGenerating ? 'Generating…' : 'Generate'}
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
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
              const out = outputs?.find((o) => o.type === t);
              const txt = out?.content || '';
              return (
                <TabsContent key={t} value={t} className="mt-4">
                  {!hasAnyOutput ? (
                    <div className="rounded-2xl border bg-muted/20 p-6 text-sm text-muted-foreground">
                      Generated output will appear here after you click Generate.
                    </div>
                  ) : (
                    <div className="rounded-2xl border bg-background p-4 text-sm leading-relaxed shadow-sm">
                      <div className="mb-2 text-xs font-medium text-muted-foreground">
                        {out?.label || CONTENT_TYPE_MAP[t]?.label || t}
                      </div>
                      <div className="whitespace-pre-wrap">{txt || '—'}</div>
                    </div>
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
                  const out = outputs?.find((o) => o.type === t);
                  const txt = out?.content || '';
                  return (
                    <div key={t} className="rounded-2xl border bg-background p-4 text-sm leading-relaxed shadow-sm">
                      <div className="mb-2 text-xs font-medium text-muted-foreground">
                        {out?.label || CONTENT_TYPE_MAP[t]?.label || t}
                      </div>
                      <div className="whitespace-pre-wrap">{txt || '—'}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              (() => {
                const out = outputs?.find((o) => o.type === effectiveActive);
                const txt = out?.content || '';
                return (
                  <div className="rounded-2xl border bg-background p-4 text-sm leading-relaxed shadow-sm">
                    <div className="mb-2 text-xs font-medium text-muted-foreground">
                      {out?.label || CONTENT_TYPE_MAP[effectiveActive]?.label || effectiveActive}
                    </div>
                    <div className="whitespace-pre-wrap">{txt || '—'}</div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        <div className="rounded-2xl border bg-violet-500/10 px-4 py-3 text-xs text-violet-700 dark:text-violet-300">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>AI-generated content. Review and edit before posting.</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
