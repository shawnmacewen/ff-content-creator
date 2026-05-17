'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function InstagramCarousel2Client() {
  const [prompt, setPrompt] = React.useState<string>('Create a premium editorial background for an Instagram carousel slide. Frost style, near-white with visible ice-blue patterns, crisp, no text.');
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const runImageTest = async () => {
    setIsLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const r = await fetch('/api/generate/instagram-carousel-2/image-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size: '1024x1536' }),
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(out?.error || `Request failed (${r.status})`);
      setImageUrl(out?.imageUrl || null);
      toast.success('Image generated');
    } catch (e: any) {
      setError(e?.message || 'Failed to generate image');
      toast.error('Image generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Instagram Carousel 2.0</h1>
        <p className="text-muted-foreground">
          Fresh implementation area for next-gen carousel prompts + APIs.
        </p>
      </div>

      <Tabs defaultValue="image-test" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl">
          <TabsTrigger value="image-test" className="rounded-2xl">Image Test</TabsTrigger>
          <TabsTrigger value="carousel" className="rounded-2xl">Carousel</TabsTrigger>
        </TabsList>

        <TabsContent value="image-test" className="mt-4 space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Prompt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="min-h-[140px] w-full resize-y rounded-2xl border bg-background p-4 text-sm leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Type a prompt like ChatGPT…"
              />
              <div className="flex items-center gap-2">
                <Button className="rounded-2xl bg-violet-600 hover:bg-violet-600/90" onClick={runImageTest} disabled={isLoading || !prompt.trim()}>
                  {isLoading ? 'Generating…' : 'Generate Image'}
                </Button>
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

        <TabsContent value="carousel" className="mt-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Carousel (coming next)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This tab will host the new storyboard/campaign art-direction carousel flow.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
