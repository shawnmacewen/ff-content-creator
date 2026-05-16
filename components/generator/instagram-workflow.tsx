'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  InstagramCarouselPreview,
  type CarouselSlide,
  type InstagramFormat,
  type InstagramToneUI,
} from './instagram-carousel-preview';
import { Instagram } from 'lucide-react';

function mockSlides(count: number): CarouselSlide[] {
  const base = [
    {
      headline: 'Conflict Adds\nRisk Premium',
      summary: 'Oil markets react to headlines fast. Here’s what changed—and what to watch next.',
    },
    {
      headline: 'Brent Crude\nSurges Above $90',
      summary: 'Prices climbed as uncertainty rose. Volatility can show up quickly across energy.',
    },
    {
      headline: 'Supply Risks\nFrom Iran',
      summary: 'Escalation could reshape flows. Markets reprice when supply disruption risks rise.',
    },
    {
      headline: 'Red Sea Shipping\nDisruptions',
      summary: 'Attacks on vessels raise costs and delay critical shipments—affecting pricing.',
    },
    {
      headline: 'OPEC+ Balances\nThe Market',
      summary: 'Production decisions help stabilize prices, but the backdrop remains dynamic.',
    },
    {
      headline: 'What Investors\nShould Watch',
      summary: 'Watch geopolitical updates and supply shifts—stay diversified, avoid overreacting.',
    },
  ];

  return Array.from({ length: count }).map((_, i) => ({
    id: `slide-${i + 1}`,
    headline: base[i]?.headline ?? `Slide ${i + 1}`,
    summary: base[i]?.summary ?? 'Key takeaway summary goes here.',
  }));
}

function mockCaption(tone: InstagramToneUI, includeCta: boolean, hashtags: string, slideCount: number) {
  const toneLine =
    tone === 'fun'
      ? 'Markets are drama—your plan shouldn’t be.'
      : tone === 'educational'
        ? 'A quick, clear breakdown of what the latest headlines actually mean.'
        : 'A concise update to help you stay informed and focused.';

  const cta = includeCta ? '\n\nWhat are your thoughts? Drop a comment below.' : '';
  const tags = hashtags?.trim() ? `\n\n${hashtags.trim()}` : '';

  return `${toneLine}\n\nHere are ${slideCount} key takeaways—swipe through.${cta}${tags}`.trim();
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
  const [hashtags, setHashtags] = React.useState('#EnergyMarkets #OilPrices #MiddleEast #Investing');
  const [additionalInstructions, setAdditionalInstructions] = React.useState('');

  const [slides, setSlides] = React.useState<CarouselSlide[]>(() => mockSlides(6));
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [caption, setCaption] = React.useState(() => mockCaption('educational', true, '#EnergyMarkets #OilPrices #MiddleEast #Investing', 6));

  const selectedSource = selectedSourceIds[0] ?? null;

  React.useEffect(() => {
    const count = format === 'single' ? 1 : slideCount;
    setSlides(mockSlides(count));
    setActiveIndex((idx) => Math.min(idx, count - 1));
    setCaption((prev) => prev || mockCaption(toneUI, includeCta, hashtags, count));
  }, [format, slideCount]);

  React.useEffect(() => {
    const count = format === 'single' ? 1 : slideCount;
    setCaption(mockCaption(toneUI, includeCta, hashtags, count));
  }, [toneUI, includeCta, hashtags]);

  const handleGenerateMock = () => {
    const count = format === 'single' ? 1 : slideCount;
    setSlides(mockSlides(count));
    setCaption(mockCaption(toneUI, includeCta, hashtags, count));
  };

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="rounded-2xl border bg-card p-3 shadow-sm">
        <div className="grid grid-cols-4 gap-2 text-xs">
          {[
            { n: 1, label: 'Select Source' },
            { n: 2, label: 'Choose Format' },
            { n: 3, label: 'Customize' },
            { n: 4, label: 'Preview & Generate' },
          ].map((s, idx) => (
            <div
              key={s.n}
              className={cn(
                'flex items-center gap-2 rounded-2xl border px-3 py-2',
                idx === 1 ? 'border-violet-500/50 bg-violet-500/5' : 'bg-background/60'
              )}
            >
              <div className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold',
                idx === 1 ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground'
              )}>
                {s.n}
              </div>
              <div className="font-medium text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* LEFT WORKFLOW */}
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">1. Select Source Article</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border p-3">
                  <div className="h-14 w-14 overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {selectedSource ? 'Oil Markets Add Risk Premium as Middle East Conflict Escalates' : 'No article selected'}
                    </div>
                    <div className="text-xs text-muted-foreground">Bloomberg • Oct 19, 2023</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto rounded-2xl"
                    onClick={() => setSelectedSourceIds(selectedSource ? [] : ['demo-source-id'])}
                  >
                    {selectedSource ? 'Change Article' : 'Select Article'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">4. Content Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tone</Label>
                  <Select value={toneUI} onValueChange={(v) => setToneUI(v as InstagramToneUI)}>
                    <SelectTrigger className="w-full rounded-2xl">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="educational">Educational</SelectItem>
                      <SelectItem value="fun">Fun</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-[11px] text-muted-foreground">Clear, factual, and value-driven</div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">Include Call to Action</div>
                    <div className="text-xs text-muted-foreground">Example: “What are your thoughts?”</div>
                  </div>
                  <Switch checked={includeCta} onCheckedChange={setIncludeCta} />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Hashtags (Optional)</Label>
                  <Textarea value={hashtags} onChange={(e) => setHashtags(e.target.value)} className="min-h-[70px] rounded-2xl" />
                  <div className="text-[11px] text-muted-foreground">Separate with spaces</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Additional Instructions (Optional)</Label>
                  <Textarea
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="Example: Focus on impacts for investors"
                    className="min-h-[90px] rounded-2xl"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">2. Choose Social Platform</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-4 gap-3">
                {['Twitter/X', 'LinkedIn', 'Instagram', 'Facebook'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={cn(
                      'rounded-2xl border p-4 text-center text-xs font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                      p === 'Instagram' && 'border-violet-500/60 bg-violet-500/5 ring-1 ring-violet-500/30'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">3. Content Format</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setFormat('single')}
                    className={cn(
                      'w-full rounded-2xl border p-4 text-left shadow-sm transition-all hover:shadow-md',
                      format === 'single' && 'border-violet-500/60 bg-violet-500/5 ring-1 ring-violet-500/30'
                    )}
                  >
                    <div className="text-sm font-semibold">Single Post</div>
                    <div className="text-xs text-muted-foreground">Single image with caption</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('carousel')}
                    className={cn(
                      'w-full rounded-2xl border p-4 text-left shadow-sm transition-all hover:shadow-md',
                      format === 'carousel' && 'border-violet-500/60 bg-violet-500/5 ring-1 ring-violet-500/30'
                    )}
                  >
                    <div className="text-sm font-semibold">Carousel Post</div>
                    <div className="text-xs text-muted-foreground">Multi-image carousel (up to 6 slides)</div>
                  </button>
                </div>

                <div className={cn('space-y-3', format !== 'carousel' && 'opacity-50')}>
                  <div className="text-xs font-medium text-muted-foreground">Carousel Settings</div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Number of Slides</div>
                    <div className="text-xs text-muted-foreground">{slideCount} Slides</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 4, 5, 6].map((n) => (
                      <Button
                        key={n}
                        type="button"
                        variant={slideCount === n ? 'default' : 'outline'}
                        className={cn('rounded-2xl', slideCount === n && 'bg-violet-600 hover:bg-violet-600/90')}
                        disabled={format !== 'carousel'}
                        onClick={() => setSlideCount(n)}
                      >
                        {n} Slides
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-2xl border bg-gradient-to-br from-violet-500/10 via-transparent to-transparent p-4 text-xs text-muted-foreground shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-violet-600/90 text-white">
                <Instagram className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium text-foreground">Instagram generation</div>
                <div className="mt-0.5">AI will analyze the article and create a carousel highlighting key insights.</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Instagram Mode</Label>
                <Switch checked={instagramMode} onCheckedChange={setInstagramMode} />
              </div>
              <Button className="rounded-2xl bg-violet-600 hover:bg-violet-600/90" onClick={handleGenerateMock}>
                Generate
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT PREVIEW */}
        <div className="lg:sticky lg:top-6 h-fit">
          <InstagramCarouselPreview
            slides={instagramMode ? slides : mockSlides(1)}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            caption={caption}
            setCaption={setCaption}
          />
        </div>
      </div>
    </div>
  );
}
