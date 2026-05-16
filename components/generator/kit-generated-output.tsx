'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { ContentType } from '@/lib/types/content';
import { CONTENT_TYPE_MAP } from '@/lib/content-config';
import { cn } from '@/lib/utils';

export type KitOutput = {
  type: ContentType;
  label?: string;
  content: string;
};

const PREVIEW_MOCK: Record<string, string> = {
  'social-instagram':
    'Global oil markets are navigating heightened geopolitical risk. Here are 6 key takeaways from the latest developments in the Middle East and what investors should watch in 2024. 👇\n\n#EnergyMarkets #OilPrices #Geopolitics #Investing #OPEC #MarketUpdate',
  'social-linkedin':
    'Oil markets are repricing geopolitical risk. Here are the key implications for investors—and what to watch next.\n\n1) What changed\n2) Why it matters\n3) Practical takeaways\n\n(Disclosure: This is general information, not investment advice.)',
  'video-script':
    'HOOK: Oil just moved—here’s why.\n\nBEAT 1: Headlines can change risk pricing fast.\nBEAT 2: Watch supply + shipping signals.\nBEAT 3: Diversification beats prediction.\n\nCTA: Follow for more market explainers.',
  'email-marketing':
    'Subject: What the latest oil headlines mean\nPreview: 6 quick takeaways for your week\n\nBody:\nHere are the key points we’re watching…',
  newsletter:
    'Headline: Market Update — Oil & Geopolitics\n\nThis week’s highlights:\n- 6 takeaways from the latest developments\n- What to watch next\n- Practical planning reminders',
  article:
    'Headline: Oil markets add risk premium amid escalating conflict\n\nIntro:\nMarkets are weighing…\n\nH2: What’s driving the move\nH2: What investors should watch',
};

export function KitGeneratedOutput({
  selectedTypes,
  outputs,
  isGenerating,
  onGenerate,
}: {
  selectedTypes: ContentType[];
  outputs?: KitOutput[] | null;
  isGenerating?: boolean;
  onGenerate?: () => void;
}) {
  const types = selectedTypes.length ? selectedTypes : (['social-instagram'] as ContentType[]);
  const [active, setActive] = React.useState<ContentType>(types[0]);

  React.useEffect(() => {
    if (!types.includes(active)) setActive(types[0]);
  }, [types, active]);

  const activeOutput = outputs?.find((o) => o.type === active);
  const content = activeOutput?.content || PREVIEW_MOCK[active] || 'Generated output will appear here.';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Generated Output (Preview)</CardTitle>
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
            <Button variant="outline" size="sm" className="rounded-2xl gap-2" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={active} onValueChange={(v) => setActive(v as ContentType)} className="w-full">
          <TabsList className={cn('w-full justify-start', types.length > 3 && 'flex-wrap h-auto')}
          >
            {types.map((t) => (
              <TabsTrigger key={t} value={t} className="rounded-2xl">
                {CONTENT_TYPE_MAP[t]?.label ?? t}
              </TabsTrigger>
            ))}
          </TabsList>

          {types.map((t) => {
            const out = outputs?.find((o) => o.type === t);
            const txt = out?.content || PREVIEW_MOCK[t] || content;
            return (
              <TabsContent key={t} value={t} className="mt-4">
                <div className="rounded-2xl border bg-background p-4 text-sm leading-relaxed shadow-sm">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">{out?.label || CONTENT_TYPE_MAP[t]?.label || t}</div>
                  <div className="whitespace-pre-wrap">{txt}</div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

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
