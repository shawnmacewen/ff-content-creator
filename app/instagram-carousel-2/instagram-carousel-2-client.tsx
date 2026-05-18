'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Info, ScrollText } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  const [cohesionMethod, setCohesionMethod] = React.useState<'prompt' | 'image-ref'>('image-ref');
  const [imageRefMode, setImageRefMode] = React.useState<'previous' | 'first'>('previous');
  const [moreSeamlessBackground, setMoreSeamlessBackground] = React.useState(false);

  const [masterplates, setMasterplates] = React.useState<Masterplate[]>([]);
  const [slides, setSlides] = React.useState<Slide[]>([]);

  const [lastPromptUsed, setLastPromptUsed] = React.useState<string>('');
  const [promptLog, setPromptLog] = React.useState<string>('');
  const [promptModalOpen, setPromptModalOpen] = React.useState(false);
  const [slidesView, setSlidesView] = React.useState<'tile' | 'compact' | 'swipe'>('tile');

  const swipeRef = React.useRef<HTMLDivElement | null>(null);
  const swipeDrag = React.useRef<{ isDown: boolean; startX: number; scrollLeft: number }>({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const systemSuffix = 'from the lens of a financial advisor.';

  const buildLayoutSpec = (opts: { size: '1536x512' | '1024x512' | '512x512'; panels: 3 | 2 | 1; moreSeamlessBackground?: boolean }) => {
    const W = opts.size === '1536x512' ? 1536 : opts.size === '1024x512' ? 1024 : 512;
    const seamText = opts.panels === 3
      ? 'Avoid placing faces, key objects, or readable text on or near the seam lines (x≈512 and x≈1024).'
      : opts.panels === 2
        ? 'Avoid placing faces, key objects, or readable text on or near the seam line (x≈512).'
        : 'No internal seams (single panel).';

    const cropLine = opts.panels === 3
      ? 'CRITICAL: there must be NO gutters and NO padding between panels, so the image can be cropped deterministically at x=0..512, 512..1024, 1024..1536.'
      : opts.panels === 2
        ? 'CRITICAL: there must be NO gutters and NO padding between panels, so the image can be cropped deterministically at x=0..512, 512..1024.'
        : 'CRITICAL: there must be NO padding; this is a single 512x512 slide.';

    const splitLine = opts.panels === 3
      ? 'Split into exactly THREE equal square panels arranged LEFT-TO-RIGHT (each panel = 512x512).'
      : opts.panels === 2
        ? 'Split into exactly TWO equal square panels arranged LEFT-TO-RIGHT (each panel = 512x512).'
        : 'This is a SINGLE square slide (512x512).';

    return [
      'CAROUSEL MASTERPLATE LAYOUT REQUIREMENTS (do not mention these requirements explicitly):',
      `Canvas: ${opts.size}.`,
      splitLine,
      cropLine,
      `SEAMLESS REQUIREMENT: treat the full ${W}x512 as ONE continuous panorama/scene where applicable. The background, lighting, color palette, texture, and horizon lines must flow smoothly across any panel boundaries.`,
      opts.moreSeamlessBackground
        ? 'MORE SEAMLESS BACKGROUND: increase the seamlessness of the background across panel seams and between masterplates. Keep the same overall art direction; do not change style because of this instruction.'
        : '',
      'Do NOT add borders, frames, separators, hard edges, or visible seams at the panel boundaries.',
      seamText,
      // Overlap-zone support (Option 1: prompt-only)
      'OVERLAP ZONE REQUIREMENT: Reserve a soft 20–40px continuation zone at the far left edge and far right edge of the image. Do not place critical text in these edge zones; use them only for background/texture/colour flow/horizon/motion/environmental continuation.',
      'NO NUMBERING: Do NOT render any explicit slide numbering, counters, fractions, or sequence markers anywhere (no "1/3", no "Slide 1", no "1.", no "1 of 10", no digits used as counters).',
      'Text is allowed (headline + short bullets + CTA), but must be large, high-contrast, and fully contained within a single panel (do not straddle boundaries).',
      'No logos or watermarks.',
    ].filter(Boolean).join(' ');
  };

  const cropPlate = React.useCallback(async (src: string, opts: { size: '1536x512' | '1024x512' | '512x512'; panels: 3 | 2 | 1 }) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    const load = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for cropping (CORS or network issue)'));
    });

    img.src = src;
    await load;

    const W = opts.size === '1536x512' ? 1536 : opts.size === '1024x512' ? 1024 : 512;
    const H = 512;
    const panelW = 512;

    if (img.naturalWidth !== W || img.naturalHeight !== H) {
      throw new Error(`Unexpected image size ${img.naturalWidth}x${img.naturalHeight}; expected ${W}x${H}`);
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    const urls: string[] = [];
    for (let i = 0; i < opts.panels; i++) {
      canvas.width = panelW;
      canvas.height = H;
      ctx.clearRect(0, 0, panelW, H);
      ctx.drawImage(img, i * panelW, 0, panelW, H, 0, 0, panelW, H);
      urls.push(canvas.toDataURL('image/png'));
    }

    // For a single 512x512 slide, just return 1.
    return urls;
  }, []);

  const generateOneMasterplate = async (
    promptToSend: string,
    opts: { size: '1536x512' | '1024x512' | '512x512' },
    referenceImageUrl?: string
  ) => {
    const r = await fetch('/api/generate/instagram-carousel-2/image-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptToSend,
        model,
        size: opts.size,
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
    size: '1536x512' | '1024x512' | '512x512';
    panels: 3 | 2 | 1;
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
      args.plateIndex === 0
        ? ''
        : cohesionMethod === 'prompt'
          ? [
              'CONTINUATION REQUIREMENT:',
              'Continue seamlessly from the previous masterplate. Maintain the same visual universe, illustration style, typography treatment, colour palette, lighting direction, composition, and financial-advisor tone.',
              'The left edge of this new masterplate should visually continue from the right edge of the previous masterplate, as if the carousel is moving left-to-right through one connected visual story.',
              'PRIORITIZE EDGE CONTINUITY: the left 40px must visually match/continue from the previous masterplate’s right 40px (colour flow, gradients, horizon lines, textures).',
            ].join(' ')
          : [
              'IMAGE-REFERENCE CONTINUATION REQUIREMENT:',
              'Use the provided reference image ONLY to match the visual universe (style, palette, typography treatment, lighting direction, rendering style) and to align the left edge continuation zone with the previous masterplate’s right edge.',
              'PRIORITIZE EDGE CONTINUITY: make the left 40px of this masterplate visually continue from the reference image’s right 40px (colour flow, gradients, horizon lines, textures).',
              'Do NOT copy/paste or recreate the exact same scene/scenery or the exact same slide text. Create a NEW composition and new background details that feel like the next moment/location in the same story/world.',
              'Change camera framing slightly (pan/zoom/angle) and introduce new background elements, but keep the same art direction and seamless edge continuity.',
            ].join(' ');

    const contentUniquenessRule = args.plateIndex === 0
      ? `CONTENT RULE: Ensure slides ${args.slideStart}–${args.slideEnd} each have distinct, non-overlapping messaging (no repeated headlines/bullets). Maintain consistent formatting style, but vary the actual wording and points across slides.`
      : `CONTENT UNIQUENESS + CONTINUATION RULE: Slides ${args.slideStart}–${args.slideEnd} MUST introduce new information and MUST NOT repeat the same headline, bullets, or CTA from earlier slides (${1}–${args.slideStart - 1}). Keep formatting consistent, but change the actual message and examples. Assume earlier slides already exist and avoid restating them.`;

    const outroLine = args.slideEnd === args.totalSlides
      ? `OUTRO REQUIREMENT: Make slide ${args.totalSlides} (the FINAL slide of the entire carousel) a strong closing slide with a clear CTA and summary bullets. Do not create any other outro/CTA on earlier slides.`
      : `NON-FINAL PLATE RULE: These slides are NOT the end of the carousel. Do NOT include any outro, conclusion language, "wrap-up", or CTA on slides ${args.slideStart}–${args.slideEnd}. Save the CTA for the final slide ${args.totalSlides}.`;

    const layoutSpec = buildLayoutSpec({ size: args.size, panels: args.panels, moreSeamlessBackground });

    const promptToSend = [userPrompt, slideRangeLine, unusedPanelsRule, contentUniquenessRule, outroLine, continuationLine, layoutSpec]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    return promptToSend;
  };

  const runCarouselGeneration = async () => {
    // eslint-disable-next-line no-console
    console.log('runCarouselGeneration:start', { slideCount, cohesionMethod, imageRefMode, model, topic });

    setIsLoading(true);
    setError(null);
    setMasterplates([]);
    setSlides([]);
    setPromptLog('');

    try {
      const count = Math.max(2, Math.min(10, Math.floor(Number(slideCount) || 3)));
      const platesNeeded = Math.ceil(count / 3);

      const platePlan: Array<{ plateIndex: number; slideStart: number; slideEnd: number; size: '1536x512' | '1024x512' | '512x512'; panels: 3 | 2 | 1 }> = [];
      for (let plateIndex = 0; plateIndex < platesNeeded; plateIndex++) {
        const slideStart = plateIndex * 3 + 1;
        const slideEnd = Math.min(slideStart + 2, count);
        // NOTE: OpenAI Images API currently rejects 1024x512 (below minimum pixel budget),
        // so we always generate 1536x512 masterplates and use UNUSED PANEL RULE for partial final plates.
        const panels = 3 as const;
        const size = '1536x512' as const;
        platePlan.push({ plateIndex, slideStart, slideEnd, size, panels });
      }

      // eslint-disable-next-line no-console
      console.log('runCarouselGeneration:platePlan', { count, platesNeeded, platePlan });

      const newMasterplates: Masterplate[] = [];
      const newSlides: Slide[] = [];

      // Iterate by index to avoid any weirdness with destructuring/iterators in production bundles.
      for (let i = 0; i < platePlan.length; i++) {
        const plate = platePlan[i]!;
        const plateIndex = plate.plateIndex;
        const slideStart = plate.slideStart;
        const slideEnd = plate.slideEnd;
        const size = plate.size;
        const panels = plate.panels;

        // eslint-disable-next-line no-console
        console.log('runCarouselGeneration:plateLoop', { plateIndex, slideStart, slideEnd, size, panels });

        let promptToSend = '';
        try {
          promptToSend = buildPlatePrompt({ plateIndex, platesNeeded, slideStart, slideEnd, totalSlides: count, size, panels });
        } catch (e: any) {
          // eslint-disable-next-line no-console
          console.error('buildPlatePrompt failed', { plateIndex, slideStart, slideEnd, size, panels }, e);
          throw e;
        }

        setLastPromptUsed(promptToSend);
        setPromptLog((prev) => {
          const header = `--- Masterplate ${plateIndex + 1} (slides ${slideStart}-${slideEnd}) prompt ---`;
          return [prev, `${header}\n${promptToSend}`].filter(Boolean).join('\n\n');
        });

        const referenceUrl =
          cohesionMethod === 'image-ref' && plateIndex > 0
            ? (imageRefMode === 'first' ? newMasterplates[0]?.imageUrl : newMasterplates[newMasterplates.length - 1]?.imageUrl)
            : undefined;

        let out: { imageUrl: string; promptUsed: string };
        try {
          out = await generateOneMasterplate(promptToSend, { size }, referenceUrl);
        } catch (e: any) {
          // If image-ref edits fail (often due to size/aspect constraints), fall back to prompt-only generation.
          if (referenceUrl && cohesionMethod === 'image-ref') {
            const msg = typeof e?.message === 'string' ? e.message : 'Image reference cohesion failed; retrying without reference.';
            toast.error(`${msg} (fallback: prompt-only)`);
            out = await generateOneMasterplate(promptToSend, { size }, undefined);
          } else {
            throw e;
          }
        }

        const plateOut: Masterplate = {
          id: `plate-${Date.now()}-${plateIndex}`,
          plateIndex,
          slideStart,
          slideEnd,
          imageUrl: out.imageUrl,
          promptUsed: out.promptUsed,
        };

        newMasterplates.push(plateOut);
        setMasterplates([...newMasterplates]);

        const cropped = await cropPlate(out.imageUrl, { size, panels });
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
      // Surface full details during development/testing.
      // eslint-disable-next-line no-console
      console.error('Carousel generation failed:', e);

      const msg =
        typeof e?.message === 'string'
          ? e.message
          : typeof e === 'string'
            ? e
            : e
              ? JSON.stringify(e)
              : 'Failed to generate carousel';

      const stack = typeof e?.stack === 'string' ? e.stack : '';
      const combined = stack ? `${msg}\n\n${stack}` : msg;

      setError(combined);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const enabledSlideCounts = new Set([3, 6, 9]);

  const SlideCountSelect = (
    <Tooltip>
      <TooltipTrigger asChild>
        <select
          className="h-9 rounded-2xl border bg-background px-3 text-sm"
          value={slideCount}
          onChange={(e) => setSlideCount(parseInt(e.target.value, 10))}
          disabled={isLoading}
        >
          {Array.from({ length: 9 }).map((_, i) => {
            const v = i + 2;
            const enabled = enabledSlideCounts.has(v);
            return (
              <option key={v} value={v} disabled={!enabled}>
                {v} slides{enabled ? '' : ' (in progress)'}
              </option>
            );
          })}
        </select>
      </TooltipTrigger>
      <TooltipContent sideOffset={6} className="max-w-[260px]">
        In progress for other slide counts.
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Instagram Carousel 2.0</h1>
        <p className="text-muted-foreground">Fresh implementation area for next-gen carousel prompts + APIs.</p>
      </div>

      <Tabs defaultValue="carousel" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl">
          <TabsTrigger value="carousel" className="rounded-2xl">
            Carousel
          </TabsTrigger>
          <TabsTrigger value="image-test" className="rounded-2xl">
            MasterPlates Images
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
                <div className="flex items-center gap-1">
                  <label className="text-xs text-muted-foreground">Slides</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-muted-foreground hover:text-foreground"
                        aria-label="Slides help"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6} className="max-w-[320px]">
                      <div className="space-y-1">
                        <div>We generate 1536×512 masterplates (3 slides per plate) and crop into 512×512 slides.</div>
                        <div>Only 3 / 6 / 9 are enabled right now.</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
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

                <div className="ml-2 flex items-center gap-1">
                  <label className="text-xs text-muted-foreground">MasterPlate Cohesion Method</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-muted-foreground hover:text-foreground"
                        aria-label="MasterPlate Cohesion Method help"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6} className="max-w-[340px]">
                      <div className="space-y-1">
                        <div className="font-medium">Prompt Based</div>
                        <div>Uses text-only continuation instructions across masterplates.</div>
                        <div className="mt-2 font-medium">Image Reference</div>
                        <div>Sends a prior masterplate image back to the image model as a reference (image edits) to improve visual continuity across plates.</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <select
                  className="h-9 rounded-2xl border bg-background px-3 text-sm"
                  value={cohesionMethod}
                  onChange={(e) => setCohesionMethod(e.target.value as any)}
                  disabled={isLoading}
                >
                  <option value="prompt">Prompt Based</option>
                  <option value="image-ref">Image Reference</option>
                </select>

                {cohesionMethod === 'image-ref' ? (
                  <>
                    <label className="ml-2 text-xs text-muted-foreground" title="Choose which prior masterplate to use as the reference image for generating the next masterplate.">Image Ref</label>
                    <select
                      className="h-9 rounded-2xl border bg-background px-3 text-sm"
                      value={imageRefMode}
                      onChange={(e) => setImageRefMode(e.target.value as any)}
                      disabled={isLoading}
                    >
                      <option value="previous">Previous masterplate</option>
                      <option value="first">First masterplate</option>
                    </select>

                    <label className="ml-2 inline-flex select-none items-center gap-2 text-xs text-muted-foreground" title="When enabled, adds a minimal instruction to make backgrounds more seamless across seams/masterplates (no style change).">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-violet-600"
                        checked={moreSeamlessBackground}
                        onChange={(e) => setMoreSeamlessBackground(e.target.checked)}
                        disabled={isLoading}
                      />
                      More Seamless background
                    </label>
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
                      disabled={!(promptLog || lastPromptUsed)}
                      title="View generation prompt log"
                    >
                      <ScrollText className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Prompt log (this run)</DialogTitle>
                    </DialogHeader>
                    <textarea
                      readOnly
                      className="min-h-[320px] w-full resize-y rounded-2xl border bg-background p-4 font-mono text-xs leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                      value={(promptLog || lastPromptUsed || '').trim()}
                      placeholder="Generate a carousel to populate the prompt log…"
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

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <label className="text-xs text-muted-foreground">Slides</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-muted-foreground hover:text-foreground"
                        aria-label="Slides help"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6} className="max-w-[320px]">
                      <div className="space-y-1">
                        <div>We generate 1536×512 masterplates (3 slides per plate) and crop into 512×512 slides.</div>
                        <div>Only 3 / 6 / 9 are enabled right now.</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
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

                <div className="ml-2 flex items-center gap-1">
                  <label className="text-xs text-muted-foreground">MasterPlate Cohesion Method</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-muted-foreground hover:text-foreground"
                        aria-label="MasterPlate Cohesion Method help"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6} className="max-w-[340px]">
                      <div className="space-y-1">
                        <div className="font-medium">Prompt Based</div>
                        <div>Uses text-only continuation instructions across masterplates.</div>
                        <div className="mt-2 font-medium">Image Reference</div>
                        <div>Sends a prior masterplate image back to the image model as a reference (image edits) to improve visual continuity across plates.</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <select
                  className="h-9 rounded-2xl border bg-background px-3 text-sm"
                  value={cohesionMethod}
                  onChange={(e) => setCohesionMethod(e.target.value as any)}
                  disabled={isLoading}
                >
                  <option value="prompt">Prompt Based</option>
                  <option value="image-ref">Image Reference</option>
                </select>

                {cohesionMethod === 'image-ref' ? (
                  <>
                    <label className="ml-2 text-xs text-muted-foreground">Image Ref</label>
                    <select
                      className="h-9 rounded-2xl border bg-background px-3 text-sm"
                      value={imageRefMode}
                      onChange={(e) => setImageRefMode(e.target.value as any)}
                      disabled={isLoading}
                    >
                      <option value="previous">Previous masterplate</option>
                      <option value="first">First masterplate</option>
                    </select>

                    <label className="ml-2 inline-flex select-none items-center gap-2 text-xs text-muted-foreground" title="When enabled, adds a minimal instruction to make backgrounds more seamless across seams/masterplates (no style change).">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-violet-600"
                        checked={moreSeamlessBackground}
                        onChange={(e) => setMoreSeamlessBackground(e.target.checked)}
                        disabled={isLoading}
                      />
                      More Seamless background
                    </label>
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
                      disabled={!(promptLog || lastPromptUsed)}
                      title="View generation prompt log"
                    >
                      <ScrollText className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Prompt log (this run)</DialogTitle>
                    </DialogHeader>
                    <textarea
                      readOnly
                      className="min-h-[320px] w-full resize-y rounded-2xl border bg-background p-4 font-mono text-xs leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                      value={(promptLog || lastPromptUsed || '').trim()}
                      placeholder="Generate a carousel to populate the prompt log…"
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
              <CardHeader className="space-y-2">
                <CardTitle className="text-base">Carousel slides</CardTitle>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs text-muted-foreground">View</div>
                  <Button
                    type="button"
                    variant={slidesView === 'tile' ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-2xl"
                    onClick={() => setSlidesView('tile')}
                    disabled={isLoading}
                  >
                    Tile
                  </Button>
                  <Button
                    type="button"
                    variant={slidesView === 'compact' ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-2xl"
                    onClick={() => setSlidesView('compact')}
                    disabled={isLoading}
                  >
                    Compact
                  </Button>
                  <Button
                    type="button"
                    variant={slidesView === 'swipe' ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-2xl"
                    onClick={() => setSlidesView('swipe')}
                    disabled={isLoading}
                  >
                    Swipe
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const ordered = slides
                    .filter((s) => s.slideNumber <= slideCount)
                    .slice()
                    .sort((a, b) => a.slideNumber - b.slideNumber)
                    .slice(0, slideCount);

                  if (slidesView === 'swipe') {
                    return (
                      <div
                        ref={swipeRef}
                        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory cursor-grab active:cursor-grabbing select-none"
                        style={{ WebkitOverflowScrolling: 'touch' }}
                        onPointerDown={(e) => {
                          const el = swipeRef.current;
                          if (!el) return;
                          swipeDrag.current.isDown = true;
                          swipeDrag.current.startX = e.clientX;
                          swipeDrag.current.scrollLeft = el.scrollLeft;
                          (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
                        }}
                        onPointerUp={(e) => {
                          swipeDrag.current.isDown = false;
                          (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId);
                        }}
                        onPointerCancel={() => {
                          swipeDrag.current.isDown = false;
                        }}
                        onPointerLeave={() => {
                          swipeDrag.current.isDown = false;
                        }}
                        onPointerMove={(e) => {
                          if (!swipeDrag.current.isDown) return;
                          const el = swipeRef.current;
                          if (!el) return;
                          const dx = e.clientX - swipeDrag.current.startX;
                          el.scrollLeft = swipeDrag.current.scrollLeft - dx;
                        }}
                      >
                        {ordered.map((s) => (
                          <div key={s.id} className="min-w-[260px] w-[260px] sm:min-w-[320px] sm:w-[320px] snap-start space-y-2 pointer-events-none">
                            <div className="text-xs text-muted-foreground">Slide {s.slideNumber}</div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={s.imageUrl} alt={`Slide ${s.slideNumber}`} className="w-full rounded-2xl border" />
                          </div>
                        ))}
                      </div>
                    );
                  }

                  const gridClass = slidesView === 'compact'
                    ? 'grid grid-cols-2 gap-3 sm:grid-cols-4'
                    : 'grid grid-cols-1 gap-3 sm:grid-cols-3';

                  const imgClass = slidesView === 'compact'
                    ? 'w-full rounded-xl border'
                    : 'w-full rounded-2xl border';

                  return (
                    <div className={gridClass}>
                      {ordered.map((s) => (
                        <div key={s.id} className="space-y-2">
                          <div className="text-xs text-muted-foreground">Slide {s.slideNumber}</div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s.imageUrl} alt={`Slide ${s.slideNumber}`} className={imgClass} />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
