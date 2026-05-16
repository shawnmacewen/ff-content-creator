'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { InstagramCarouselPreview, type CarouselSlide, type InstagramFormat, type InstagramToneUI } from './instagram-carousel-preview';
import { Sparkles, Instagram, Wand2 } from 'lucide-react';

function mockSlides(count: number): CarouselSlide[] {
  const base = [
    { headline: 'Why rates matter right now', summary: 'A quick look at what’s driving today’s moves — and what it means for everyday investors.' },
    { headline: 'The headline risk premium', summary: 'Markets price uncertainty fast. Here’s how risk gets reflected across sectors.' },
    { headline: 'What to watch next', summary: 'Key signals to track over the next 2–4 weeks (inflation prints, guidance, flows).' },
    { headline: 'Portfolio implications', summary: 'Ways to think about diversification and duration without making promises.' },
    { headline: 'Common questions', summary: 'Short answers to the FAQs clients usually ask when volatility spikes.' },
    { headline: 'Bottom line', summary: 'A clear takeaway + a calm, practical next step you can act on this week.' },
  ];
  return Array.from({ length: count }).map((_, i) => ({
    id: `slide-${i + 1}`,
    headline: base[i]?.headline ?? `Slide ${i + 1}`,
    summary: base[i]?.summary ?? 'Key takeaway summary goes here.',
  }));
}

function mockCaption(tone: InstagramToneUI, includeCta: boolean, includeHashtags: boolean) {
  const toneLine =
    tone === 'fun' ? 'Let’s make markets make sense — without the jargon.' :
    tone === 'educational' ? 'A quick, clear breakdown of what the latest headlines actually mean.' :
    'A concise update to help you stay informed and focused.';

  const cta = includeCta ? '\n\nWhat’s your takeaway? Drop a comment — happy to unpack.' : '';
  const tags = includeHashtags ? '\n\n#Investing #Markets #FinancialPlanning #WealthManagement' : '';

  return `${toneLine}\n\nSwipe through for the key points — then save for later.${cta}${tags}`.trim();
}

export function InstagramGenerateWorkflow({
  selectedSourceIds,
  setSelectedSourceIds,
}: {
  selectedSourceIds: string[];
  setSelectedSourceIds: (ids: string[]) => void;
}) {
  const [instagramMode, setInstagramMode] = React.useState(true);
  const [format, setFormat] = React.useState<InstagramFormat>('carousel');
  const [toneUI, setToneUI] = React.useState<InstagramToneUI>('educational');
  const [slideCount, setSlideCount] = React.useState<number>(6);
  const [includeCta, setIncludeCta] = React.useState(true);
  const [includeHashtags, setIncludeHashtags] = React.useState(true);
  const [additionalInstructions, setAdditionalInstructions] = React.useState('');

  const [slides, setSlides] = React.useState<CarouselSlide[]>(() => mockSlides(6));
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [caption, setCaption] = React.useState(() => mockCaption('educational', true, true));

  React.useEffect(() => {
    if (format === 'single') {
      setSlides(mockSlides(1));
      setActiveIndex(0);
      return;
    }
    setSlides(mockSlides(slideCount));
    setActiveIndex((idx) => Math.min(idx, slideCount - 1));
  }, [format, slideCount]);

  const handleGenerateMock = () => {
    const count = format === 'single' ? 1 : slideCount;
    setSlides(mockSlides(count));
    setCaption(mockCaption(toneUI, includeCta, includeHashtags));
  };

  const selectedSource = selectedSourceIds[0] ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <div className="rounded-2xl border bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
                <Wand2 className="h-4 w-4 text-violet-600" />
                Generate Social Content
              </div>
              <div className="text-xs text-muted-foreground">Notion-clean workflow, Canva-level previews, Grammarly-style edits.</div>
            </div>
            <Button className="gap-2 rounded-2xl shadow-sm" onClick={handleGenerateMock}>
              <Sparkles className="h-4 w-4" />
              Generate
            </Button>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl border bg-background/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-600/90 text-white shadow-sm">
                <Instagram className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">Instagram mode</div>
                <div className="text-xs text-muted-foreground">Caption + carousel slide pack</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs text-muted-foreground">Off</Label>
              <Switch checked={instagramMode} onCheckedChange={setInstagramMode} />
              <Label className="text-xs text-muted-foreground">On</Label>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">1. Select Source Article</CardTitle>
              <CardDescription>Choose an existing article/source to pull key insights from.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={cn('rounded-2xl border p-4 transition-colors', selectedSource ? 'bg-background' : 'bg-muted/30')}>
                <div className="text-sm font-medium">{selectedSource ? `Selected: ${selectedSource}` : 'No article selected'}</div>
                <div className="mt-1 text-xs text-muted-foreground">(Mock UI) Use the Source Content step below to select an item.</div>
              </div>
              <Button
                variant="outline"
                className="w-full rounded-2xl"
                onClick={() => setSelectedSourceIds(selectedSource ? [] : ['demo-source-id'])}
              >
                {selectedSource ? 'Clear Selection' : 'Select Demo Article'}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">2. Choose Format</CardTitle>
              <CardDescription>Single post or carousel pack (up to 6 slides).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat('single')}
                  className={cn(
                    'rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                    format === 'single' && 'border-violet-500/60 bg-violet-500/5 ring-1 ring-violet-500/30'
                  )}
                >
                  <div className="text-sm font-semibold">Single Post</div>
                  <div className="mt-1 text-xs text-muted-foreground">1 slide + caption</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('carousel')}
                  className={cn(
                    'rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                    format === 'carousel' && 'border-violet-500/60 bg-violet-500/5 ring-1 ring-violet-500/30'
                  )}
                >
                  <div className="text-sm font-semibold">Carousel Post</div>
                  <div className="mt-1 text-xs text-muted-foreground">Up to 6 slides</div>
                </button>
              </div>

              <div className={cn('space-y-3 rounded-2xl border p-4', format !== 'carousel' && 'opacity-50')}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Slides</div>
                    <div className="text-xs text-muted-foreground">Select 3–6 slides</div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{slideCount}</div>
                </div>
                <Slider
                  disabled={format !== 'carousel'}
                  min={3}
                  max={6}
                  step={1}
                  value={[slideCount]}
                  onValueChange={(v) => setSlideCount(v[0] ?? 6)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">3. Customize</CardTitle>
            <CardDescription>Tone, CTA, hashtags, and extra instructions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tone</Label>
              <Select value={toneUI} onValueChange={(v) => setToneUI(v as InstagramToneUI)}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="fun">Fun</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
                <div>
                  <div className="text-sm font-medium">Include CTA</div>
                  <div className="text-xs text-muted-foreground">Adds a comment/save prompt</div>
                </div>
                <Switch checked={includeCta} onCheckedChange={setIncludeCta} />
              </div>

              <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
                <div>
                  <div className="text-sm font-medium">Include hashtags</div>
                  <div className="text-xs text-muted-foreground">Adds optional hashtag block</div>
                </div>
                <Switch checked={includeHashtags} onCheckedChange={setIncludeHashtags} />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs text-muted-foreground">Additional instructions</Label>
              <Textarea
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder="Example: Focus on implications for long-term investors. Avoid market timing language."
                className="min-h-[110px] rounded-2xl"
              />
              <div className="text-[11px] text-muted-foreground">
                For now we’re using mock generation output. Next iteration can wire this into /api/generate.
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      <div className="lg:sticky lg:top-6 h-fit">
        <InstagramCarouselPreview
          slides={instagramMode ? slides : mockSlides(1)}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          caption={caption}
          setCaption={setCaption}
        />

        <div className="mt-4 rounded-2xl border bg-gradient-to-br from-violet-500/10 via-transparent to-transparent p-4 text-xs text-muted-foreground shadow-sm">
          <div className="font-medium text-foreground">Editable output</div>
          <div className="mt-1">Click any slide to select it, then edit headline/summary inline (next step). Caption is editable now.</div>
        </div>
      </div>
    </div>
  );
}
