'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollText } from 'lucide-react';

type Masterplate = {
  id: string;
  plateIndex: number;
  slideStart: number;
  slideEnd: number;
  imageUrl: string;
  promptUsed: string;
};

type Slide = {
  id: string;
  slideNumber: number;
  plateIndex: number;
  cropIndex: number; // 0..2 within the plate
  imageUrl: string;
};

export default function InstagramCarousel2Client() {
  const [topic, setTopic] = React.useState<string>('Canadian housing market');
  const [slideCount, setSlideCount] = React.useState<number>(3);
  const [model, setModel] = React.useState<'gpt-image-2' | 'gpt-image-1'>('gpt-image-2');
  const [cohesionMethod, setCohesionMethod] = React.useState<'prompt' | 'image-ref'>('prompt');
  const [imageRefMode, setImageRefMode] = React.useState<'previous' | 'first'>('previous');

  const [masterplates, setMasterplates] = React.useState<Masterplate[]>([]);
  const [slides, setSlides] = React.useState<Slide[]>([]);

  const [lastPromptUsed, setLastPromptUsed] = React.useState<string>('');
  const [promptModalOpen, setPromptModalOpen] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const systemSuffix = 'from the lens of a financial advisor.';

  const baseLayoutSpec = [
    'CAROUSEL MASTERPLATE LAYOUT REQUIREMENTS (do not mention these requirements explicitly):',
    'Canvas: 1536x512 (3:1 landscape).',
    'Split into exactly THREE equal square panels arranged LEFT-TO-RIGHT (each panel = 512x512).',
    'CRITICAL: there must be NO gutters and NO padding between panels, so the image can be cropped deterministically at x=0..512, 512..1024, 1024..1536.',
    'SEAMLESS REQUIREMENT: treat the full 1536x512 as ONE continuous panorama/scene. The background, lighting, color palette, texture, and horizon lines must flow smoothly across the 512px boundaries.',
    'Do NOT add borders, frames, separators, hard edges, or visible seams at the panel boundaries.',
    'Avoid placing faces, key objects, or readable text on or near the seam lines (x≈512 and x≈1024).',
    // Overlap-zone support (Option 1: prompt-only)
    'OVERLAP ZONE REQUIREMENT: Reserve a soft 20–40px continuation zone at the far left edge and far right edge of the masterplate. Do not place critical text in these edge zones; use them only for background/texture/colour flow/horizon/motion/environmental continuation.',
    'NO NUMBERING: Do NOT render any explicit slide numbering, counters, fractions, or sequence markers anywhere (no "1/3", no "Slide 1", no "1.", no "1 of 10", no digits used as counters).',
    'Text is allowed (headline + short bullets + CTA), but must be large, high-contrast, and fully contained within a single panel (do not straddle boundaries).',
    'No logos or watermarks.',
  ].join(' ');

  const cropMasterplateIntoThree = React.useCallback(async (src: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    const load = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for cropping (CORS or network issue)'));
    });

    img.src = src;
    await load;

    const W = 1536;
    const H = 512;
    const panelW = 512;

    if (img.naturalWidth !== W || img.naturalHeight !== H) {
      throw new Error(`Unexpected image size ${img.naturalWidth}x${img.naturalHeight}; expected ${W}x${H}`);
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    const urls: string[] = [];
    for (let i = 0; i < 3; i++) {
      canvas.width = panelW;
      canvas.height = H;
      ctx.clearRect(0, 0, panelW, H);
      ctx.drawImage(img, i * panelW, 0, panelW, H, 0, 0, panelW, H);
      urls.push(canvas.toDataURL('image/png'));
    }
    return urls;
  }, []);

  const generateOneMasterplate = async (promptToSend: string, referenceImageUrl?: string) => {
    const r = await fetch('/api/generate/instagram-carousel-2/image-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptToSend,
        model,
        size: '1536x512',
        referenceImageUrl: referenceImageUrl || undefined,
      }),
    });

    const outText = await r.text().catch(() => '');
    const out = (() => {
      try {
        return outText ? JSON.parse(outText) : {};
      } catch {
        return { raw: outText };
      }
    })();

    if (!r.ok) {
      const detail = typeof out?.error === 'string' ? out.error : outText || '';
      throw new Error(detail || `Request failed (${r.status})`);
    }

    const url = out?.imageUrl as string | undefined;
    if (!url) throw new Error('API returned no imageUrl');
    return { imageUrl: url, promptUsed: promptToSend };
  };

  const buildPlatePrompt = (args: {
    plateIndex: number;
    platesNeeded: number;
    slideStart: number;
    slideEnd: number;
    totalSlides: number;
  }) => {
    const topicClean = topic.trim().replace(/^about\s+/i, '').replace(/\.*$/, '');
    const userTopic = topicClean || 'Canadian housing market';

    const systemPrefix = `Create an Instagram carousel of ${args.totalSlides} slides about`;
    const userPrompt = `${systemPrefix} ${userTopic} ${systemSuffix}`.replace(/\s+/g, ' ').trim();

    const slideRangeLine = `This masterplate represents carousel slides ${args.slideStart}–${args.slideEnd} (inclusive).`;
    const slotsUsed = args.slideEnd - args.slideStart + 1;
    const slotMap = [
      `Panel 1 (x=0..512) = slide ${args.slideStart}`,
      slotsUsed >= 2 ? `Panel 2 (x=512..1024) = slide ${args.slideStart + 1}` : `Panel 2 (x=512..1024) = UNUSED`,
      slotsUsed >= 3 ? `Panel 3 (x=1024..1536) = slide ${args.slideStart + 2}` : `Panel 3 (x=1024..1536) = UNUSED`,
    ].join(' | ');

    const unusedPanelsRule = slotsUsed < 3
      ? `UNUSED PANEL RULE: This masterplate has only ${slotsUsed} real slide(s). Any UNUSED panel(s) must contain ONLY seamless background/texture/visual continuation with NO readable text, NO CTA, and NO new messaging. (${slotMap})`
      : `PANEL MAP: ${slotMap}`;

    const continuationLine =
      args.plateIndex === 0 || cohesionMethod !== 'prompt'
        ? ''
        : [
            'CONTINUATION REQUIREMENT:',
            'Continue seamlessly from the previous masterplate. Maintain the same visual universe, illustration style, typography treatment, colour palette, lighting direction, composition, and financial-advisor tone.',
            'The left edge of this new masterplate should visually continue from the right edge of the previous masterplate, as if the carousel is moving left-to-right through one connected visual story.',
          ].join(' ');

    const outroLine = args.slideEnd === args.totalSlides
      ? `OUTRO REQUIREMENT: Make slide ${args.totalSlides} (the FINAL slide of the entire carousel) a strong closing slide with a clear CTA and summary bullets. Do not create any other outro/CTA on earlier slides.`
      : `NON-FINAL PLATE RULE: These slides are NOT the end of the carousel. Do NOT include any outro, conclusion language, "wrap-up", or CTA on slides ${args.slideStart}–${args.slideEnd}. Save the CTA for the final slide ${args.totalSlides}.`;

    const promptToSend = [userPrompt, slideRangeLine, unusedPanelsRule, outroLine, continuationLine, baseLayoutSpec]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    return promptToSend;
  };

  const runCarouselGeneration = async () => {
    setIsLoading(true);
    setError(null);
    setMasterplates([]);
    setSlides([]);

    try {
      const count = Math.max(2, Math.min(10, Math.floor(Number(slideCount) || 3)));
      const platesNeeded = Math.ceil(count / 3);

      const newMasterplates: Masterplate[] = [];
      const newSlides: Slide[] = [];

      for (let plateIndex = 0; plateIndex < platesNeeded; plateIndex++) {
        const slideStart = plateIndex * 3 + 1;
        const slideEnd = Math.min(slideStart + 2, count);

        const promptToSend = buildPlatePrompt({ plateIndex, platesNeeded, slideStart, slideEnd, totalSlides: count });
        setLastPromptUsed(promptToSend);

        const referenceUrl =
          cohesionMethod === 'image-ref' && plateIndex > 0
            ? (imageRefMode === 'first' ? newMasterplates[0]?.imageUrl : newMasterplates[newMasterplates.length - 1]?.imageUrl)
            : undefined;

        const out = await generateOneMasterplate(promptToSend, referenceUrl);

        const plate: Masterplate = {
          id: `plate-${Date.now()}-${plateIndex}`,
          plateIndex,
          slideStart,
          slideEnd,
          imageUrl: out.imageUrl,
          promptUsed: out.promptUsed,
        };

        newMasterplates.push(plate);
        setMasterplates([...newMasterplates]);

        const cropped = await cropMasterplateIntoThree(out.imageUrl);
        const neededFromThisPlate = slideEnd - slideStart + 1;

        for (let i = 0; i < neededFromThisPlate; i++) {
          const slideNumber = slideStart + i;
          newSlides.push({
            id: `slide-${Date.now()}-${plateIndex}-${i}`,
            slideNumber,
            plateIndex,
            cropIndex: i,
            imageUrl: cropped[i]!,
          });
        }

        // Defensive: never keep more than the requested slide count.
        setSlides(newSlides.slice(0, count));
      }

      toast.success('Carousel generated');
    } catch (e: any) {
      const msg =
        typeof e?.message === 'string'
          ? e.message
          : typeof e === 'string'
            ? e
            : e
              ? JSON.stringify(e)
              : 'Failed to generate carousel';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const SlideCountSelect = (
    <select
      className="h-9 rounded-2xl border bg-background px-3 text-sm"
      value={slideCount}
      onChange={(e) => setSlideCount(parseInt(e.target.value, 10))}
      disabled={isLoading}
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const v = i + 2;
        return (
          <option key={v} value={v}>
            {v} slides
          </option>
        );
      })}
    </select>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Instagram Carousel 2.0</h1>
        <p className="text-muted-foreground">Fresh implementation area for next-gen carousel prompts + APIs.</p>
      </div>

      <Tabs defaultValue="carousel" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl">
          <TabsTrigger value="image-test" className="rounded-2xl">
            Masterplate Image
          </TabsTrigger>
          <TabsTrigger value="carousel" className="rounded-2xl">
            Carousel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image-test" className="mt-4 space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="min-h-[120px] w-full resize-y rounded-2xl border bg-background p-4 text-sm leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Topic/focus (e.g. Canadian housing market, interest rates, TFSA vs RRSP…)"
              />

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted-foreground">Slides</label>
                {SlideCountSelect}

                <label className="ml-2 text-xs text-muted-foreground">Model</label>
                <select
                  className="h-9 rounded-2xl border bg-background px-3 text-sm"
                  value={model}
                  onChange={(e) => setModel(e.target.value as any)}
                  disabled={isLoading}
                >
                  <option value="gpt-image-2">gpt-image-2 (default)</option>
                  <option value="gpt-image-1">gpt-image-1</option>
                </select>

                <label className="ml-2 text-xs text-muted-foreground">MasterPlate Cohesion Method</label>
                <select
                  className="h-9 rounded-2xl border bg-background px-3 text-sm"
                  value={cohesionMethod}
                  onChange={(e) => setCohesionMethod(e.target.value as any)}
                  disabled={isLoading}
                >
                  <option value="prompt">Prompt Based Cohesion</option>
                  <option value="image-ref">Image Reference Cohesion</option>
                </select>

                {cohesionMethod === 'image-ref' ? (
                  <>
                    <label className="ml-2 text-xs text-muted-foreground">Image Ref Uses</label>
                    <select
                      className="h-9 rounded-2xl border bg-background px-3 text-sm"
                      value={imageRefMode}
                      onChange={(e) => setImageRefMode(e.target.value as any)}
                      disabled={isLoading}
                    >
                      <option value="previous">Previous masterplate</option>
                      <option value="first">First masterplate</option>
                    </select>
                  </>
                ) : null}

                <Button
                  className="rounded-2xl bg-violet-600 hover:bg-violet-600/90"
                  onClick={runCarouselGeneration}
                  disabled={isLoading || !topic.trim()}
                >
                  Generate Carousel
                </Button>

                <Dialog open={promptModalOpen} onOpenChange={setPromptModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-2xl"
                      disabled={!lastPromptUsed}
                      title="View last prompt used"
                    >
                      <ScrollText className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Last prompt used</DialogTitle>
                    </DialogHeader>
                    <textarea
                      readOnly
                      className="min-h-[320px] w-full resize-y rounded-2xl border bg-background p-4 font-mono text-xs leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                      value={(lastPromptUsed || '').trim()}
                      placeholder="Generate an image to populate the prompt log…"
                    />
                  </DialogContent>
                </Dialog>

                {isLoading ? (
                  <div className="ml-2 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-500/70 animate-bounce [animation-delay:-0.2s]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-500/70 animate-bounce [animation-delay:-0.1s]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-500/70 animate-bounce" />
                    <span className="text-xs font-medium text-slate-600">Generating</span>
                  </div>
                ) : null}

                {error ? <div className="text-sm text-red-600">{error}</div> : null}
              </div>
            </CardContent>
          </Card>

          {masterplates.length ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Masterplates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {masterplates.map((p) => (
                  <div key={p.id} className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Masterplate {p.plateIndex + 1} (slides {p.slideStart}–{p.slideEnd})</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt={`Masterplate ${p.plateIndex + 1}`} className="w-full max-w-[720px] rounded-2xl border" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="carousel" className="mt-4 space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="min-h-[120px] w-full resize-y rounded-2xl border bg-background p-4 text-sm leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Topic/focus (e.g. Canadian housing market, interest rates, TFSA vs RRSP…)"
              />
              <div className="text-xs text-muted-foreground">
                Generates one or more 1536×512 masterplates (3 slides per plate) and crops into individual 512×512 slides.
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted-foreground">Slides</label>
                {SlideCountSelect}

                <label className="ml-2 text-xs text-muted-foreground">Model</label>
                <select
                  className="h-9 rounded-2xl border bg-background px-3 text-sm"
                  value={model}
                  onChange={(e) => setModel(e.target.value as any)}
                  disabled={isLoading}
                >
                  <option value="gpt-image-2">gpt-image-2 (default)</option>
                  <option value="gpt-image-1">gpt-image-1</option>
                </select>

                <label className="ml-2 text-xs text-muted-foreground">MasterPlate Cohesion Method</label>
                <select
                  className="h-9 rounded-2xl border bg-background px-3 text-sm"
                  value={cohesionMethod}
                  onChange={(e) => setCohesionMethod(e.target.value as any)}
                  disabled={isLoading}
                >
                  <option value="prompt">Prompt Based Cohesion</option>
                  <option value="image-ref">Image Reference Cohesion</option>
                </select>

                {cohesionMethod === 'image-ref' ? (
                  <>
                    <label className="ml-2 text-xs text-muted-foreground">Image Ref Uses</label>
                    <select
                      className="h-9 rounded-2xl border bg-background px-3 text-sm"
                      value={imageRefMode}
                      onChange={(e) => setImageRefMode(e.target.value as any)}
                      disabled={isLoading}
                    >
                      <option value="previous">Previous masterplate</option>
                      <option value="first">First masterplate</option>
                    </select>
                  </>
                ) : null}

                <Button
                  className="rounded-2xl bg-violet-600 hover:bg-violet-600/90"
                  onClick={runCarouselGeneration}
                  disabled={isLoading || !topic.trim()}
                >
                  Generate Carousel
                </Button>

                <Dialog open={promptModalOpen} onOpenChange={setPromptModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-2xl"
                      disabled={!lastPromptUsed}
                      title="View last prompt used"
                    >
                      <ScrollText className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Last prompt used</DialogTitle>
                    </DialogHeader>
                    <textarea
                      readOnly
                      className="min-h-[320px] w-full resize-y rounded-2xl border bg-background p-4 font-mono text-xs leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                      value={(lastPromptUsed || '').trim()}
                      placeholder="Generate an image to populate the prompt log…"
                    />
                  </DialogContent>
                </Dialog>

                {isLoading ? (
                  <div className="ml-2 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-500/70 animate-bounce [animation-delay:-0.2s]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-500/70 animate-bounce [animation-delay:-0.1s]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-500/70 animate-bounce" />
                    <span className="text-xs font-medium text-slate-600">Generating</span>
                  </div>
                ) : null}

                {error ? <div className="text-sm text-red-600">{error}</div> : null}
              </div>
            </CardContent>
          </Card>

          {slides.length ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Carousel slides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {slides
                    .filter((s) => s.slideNumber <= slideCount)
                    .slice()
                    .sort((a, b) => a.slideNumber - b.slideNumber)
                    .slice(0, slideCount)
                    .map((s) => (
                      <div key={s.id} className="space-y-2">
                        <div className="text-xs text-muted-foreground">Slide {s.slideNumber}</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.imageUrl} alt={`Slide ${s.slideNumber}`} className="w-full rounded-2xl border" />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
