'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollText } from 'lucide-react';

export default function InstagramCarousel2Client() {
  const [prompt, setPrompt] = React.useState<string>('Create a set of 3 Instagram carousel posts about the Canadian housing market from the lens of a financial advisor.');
  const [model, setModel] = React.useState<'gpt-image-2' | 'gpt-image-1'>('gpt-image-2');
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [panelUrls, setPanelUrls] = React.useState<string[]>([]);
  const [lastMode, setLastMode] = React.useState<'raw' | 'split-friendly' | null>(null);
  const [lastPromptUsed, setLastPromptUsed] = React.useState<string>('');
  const [promptModalOpen, setPromptModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const splitFriendlySpec = [
    'CAROUSEL MASTERPLATE LAYOUT REQUIREMENTS (do not mention these requirements explicitly):',
    'Canvas: 1536x512 (3:1 landscape).',
    'Split into exactly THREE equal square panels arranged LEFT-TO-RIGHT (each panel = 512x512).',
    'CRITICAL: there must be NO gutters and NO padding between panels, so the image can be cropped deterministically at x=0..512, 512..1024, 1024..1536.',
    'Nothing important may cross panel boundaries (keep each panel self-contained).',
    'Text is allowed (headline + short bullets + CTA), but must be large, high-contrast, and fully contained within a single panel (do not straddle boundaries).',
    'No logos or watermarks.',
  ].join(' ');

  const runImageTest = async (mode: 'raw' | 'split-friendly') => {
    setIsLoading(true);
    setError(null);
    setImageUrl(null);
    setPanelUrls([]);
    setLastMode(mode);

    const promptToSend = mode === 'split-friendly'
      ? `${prompt}\n\n${splitFriendlySpec}`.trim()
      : prompt;

    setLastPromptUsed(promptToSend);

    try {
      const r = await fetch('/api/generate/instagram-carousel-2/image-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          model,
          size: mode === 'split-friendly' ? '1536x512' : '1024x1536',
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
      setImageUrl(out?.imageUrl || null);
      toast.success('Image generated');
    } catch (e: any) {
      const msg =
        typeof e?.message === 'string' ? e.message :
        typeof e === 'string' ? e :
        e ? JSON.stringify(e) :
        'Failed to generate image';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const cropSplitFriendlyPanels = React.useCallback(async (src: string) => {
    const img = new Image();
    // Attempt to keep canvas untainted for toDataURL(); this requires the image host to send CORS headers.
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

    // Defensive: if we ever change size, keep the crop logic honest.
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

  React.useEffect(() => {
    if (!imageUrl) return;
    if (lastMode !== 'split-friendly') return;

    let cancelled = false;
    (async () => {
      try {
        const urls = await cropSplitFriendlyPanels(imageUrl);
        if (!cancelled) setPanelUrls(urls);
      } catch (e: any) {
        if (!cancelled) {
          setPanelUrls([]);
          toast.error(e?.message || 'Failed to crop panels');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imageUrl, lastMode, cropSplitFriendlyPanels]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Instagram Carousel 2.0</h1>
        <p className="text-muted-foreground">
          Fresh implementation area for next-gen carousel prompts + APIs.
        </p>
      </div>

      <Tabs defaultValue="carousel" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl">
          <TabsTrigger value="image-test" className="rounded-2xl">Masterplate Image</TabsTrigger>
          <TabsTrigger value="carousel" className="rounded-2xl">Carousel</TabsTrigger>
        </TabsList>

        <TabsContent value="image-test" className="mt-4 space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Prompt (Masterplate)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="min-h-[140px] w-full resize-y rounded-2xl border bg-background p-4 text-sm leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Type a prompt like ChatGPT…"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted-foreground">Model</label>
                <select
                  className="h-9 rounded-2xl border bg-background px-3 text-sm"
                  value={model}
                  onChange={(e) => setModel(e.target.value as any)}
                  disabled={isLoading}
                >
                  <option value="gpt-image-2">gpt-image-2 (default)</option>
                  <option value="gpt-image-1">gpt-image-1</option>
                </select>

                <Button
                  className="rounded-2xl bg-violet-600 hover:bg-violet-600/90"
                  onClick={() => runImageTest('raw')}
                  disabled={isLoading || !prompt.trim()}
                >
                  Generate Image
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

          {imageUrl ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Output</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Generated" className="w-full max-w-[420px] rounded-2xl border" />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="carousel" className="mt-4 space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Prompt (Carousel)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="min-h-[140px] w-full resize-y rounded-2xl border bg-background p-4 text-sm leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Type a prompt like ChatGPT…"
              />
              <div className="text-xs text-muted-foreground">
                Carousel mode generates a 3:1 masterplate (1536×512) that we deterministically crop into 3 square slides.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted-foreground">Model</label>
                <select
                  className="h-9 rounded-2xl border bg-background px-3 text-sm"
                  value={model}
                  onChange={(e) => setModel(e.target.value as any)}
                  disabled={isLoading}
                >
                  <option value="gpt-image-2">gpt-image-2 (default)</option>
                  <option value="gpt-image-1">gpt-image-1</option>
                </select>

                <Button
                  className="rounded-2xl bg-violet-600 hover:bg-violet-600/90"
                  onClick={() => runImageTest('split-friendly')}
                  disabled={isLoading || !prompt.trim()}
                >
                  Generate Image
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

          {imageUrl ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Output (3 slides)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {panelUrls.length === 3 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Cropped slides (x=0..512, 512..1024, 1024..1536)</div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {panelUrls.map((u, i) => (
                        <div key={i} className="space-y-2">
                          <div className="text-xs text-muted-foreground">Slide {i + 1}</div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt={`Slide ${i + 1}`} className="w-full rounded-2xl border" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Cropping pending… (if this never resolves, it’s usually a CORS/canvas issue)
                    </div>
                    {/* Fallback: still show the masterplate so you can see what was generated */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Generated" className="w-full max-w-[640px] rounded-2xl border" />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

      </Tabs>
    </div>
  );
}
