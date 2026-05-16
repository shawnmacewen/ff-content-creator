import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import sharp from 'sharp';

function pickVariantSeed(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

function buildForegroundPrompt(args: { theme: any; motif: string; placement: string; index: number; total: number }) {
  return [
    'Create a simple premium editorial foreground element for an Instagram carousel slide.',
    'Style: clean cinematic fintech editorial icon/illustration (NOT photorealistic).',
    'Return a PNG with TRANSPARENT background (sticker-style).',
    'No readable text, no logos, no watermarks.',
    `Motif: ${args.motif}.`,
    `Palette: ${args.theme?.palette || 'soft purples and neutrals'}.`,
    `Lighting: ${args.theme?.lighting || 'soft cinematic'}.`,
    `Texture: ${args.theme?.texture || 'subtle grain'}.`,
    `Consistency: must match the same visual system across slides.`,
  ].join(' ');
}

function placementToXY(args: { placement: string; canvasW: number; canvasH: number; fgW: number; fgH: number }) {
  const pad = 70;
  const midX = Math.round((args.canvasW - args.fgW) / 2);
  const midY = Math.round((args.canvasH - args.fgH) / 2);

  switch (args.placement) {
    case 'left':
      return { left: pad, top: midY };
    case 'right':
      return { left: args.canvasW - args.fgW - pad, top: midY };
    case 'center':
      return { left: midX, top: midY };
    case 'bottom-left':
      return { left: pad, top: args.canvasH - args.fgH - pad };
    case 'bottom-right':
    default:
      return { left: args.canvasW - args.fgW - pad, top: args.canvasH - args.fgH - pad };
  }
}

async function generateImage(apiKey: string, prompt: string, size: '1024x1536' | '768x1024' | '1024x1024') {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { imageUrl: null as string | null, error: data?.error?.message || `Image API error (${res.status})` };
  }

  const first = data?.data?.[0];
  if (first?.url) return { imageUrl: first.url as string };
  if (first?.b64_json) return { imageUrl: `data:image/png;base64,${first.b64_json}` };
  return { imageUrl: null as string | null, error: 'Image API returned no image payload' };
}

export async function POST(req: Request) {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY on server' }), { status: 500 });
  }

  const body = await req.json();
  const { theme, masterPlate, slideId, index, total, beat, motif, placement = 'right', quality = 'fast' } = body as {
    theme: any;
    masterPlate?: string | null;
    slideId: string;
    index: number;
    total: number;
    beat: string;
    motif?: string;
    placement?: 'left' | 'right' | 'center' | 'bottom-left' | 'bottom-right';
    quality?: 'fast' | 'cover';
  };

  const Schema = z.object({
    prompt: z.string(),
  });

  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

  // If we have a master plate, crop a connected slice for this slide (fast + cohesive)
  if (masterPlate && masterPlate.startsWith('data:image')) {
    try {
      const b64 = masterPlate.split(',')[1] || '';
      const buf = Buffer.from(b64, 'base64');

      // Create a 4:5 slide by resizing master plate to height=1280 then cropping a 1024x1280 window
      const targetH = 1280;
      const targetW = 1024;

      const resized = sharp(buf).resize({ height: targetH });
      const meta = await resized.metadata();
      const width = meta.width || 1920;
      const maxLeft = Math.max(0, width - targetW);
      const denom = Math.max(1, (total - 1));
      const left = Math.round((index / denom) * maxLeft);

      // Optional: generate a simple foreground motif and composite it on top
      let base = resized.extract({ left, top: 0, width: Math.min(targetW, width), height: targetH });

      if (motif) {
        const fgPrompt = buildForegroundPrompt({ theme, motif, placement, index, total });
        const fg = await generateImage(env.OPENAI_API_KEY, fgPrompt, '1024x1024');
        if (fg.imageUrl && fg.imageUrl.startsWith('data:image')) {
          try {
            const fgB64 = fg.imageUrl.split(',')[1] || '';
            const fgBuf = Buffer.from(fgB64, 'base64');
            // scale motif asset down for compositing
            const fgSized = await sharp(fgBuf)
              .resize({ width: 520 })
              .png()
              .toBuffer();
            const fgMeta = await sharp(fgSized).metadata();
            const fgW = fgMeta.width || 520;
            const fgH = fgMeta.height || 520;
            const { left: x, top: y } = placementToXY({ placement, canvasW: targetW, canvasH: targetH, fgW, fgH });

            base = base.composite([{ input: fgSized, left: x, top: y, blend: 'over' }]);
          } catch (e) {
            // ignore motif failures
            console.error('motif composite failed', e);
          }
        }
      }

      const outBuf = await base.png().toBuffer();
      const outB64 = outBuf.toString('base64');

      return new Response(
        JSON.stringify({ slideId, imageUrl: `data:image/png;base64,${outB64}`, error: null }),
        { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    } catch (e: any) {
      // fall through to per-slide generation
      console.error('masterPlate crop failed', e);
    }
  }

  // Fallback: Derive prompt via model so we can keep the art direction consistent and concise.
  const promptRes = await generateObject({
    model: openai(env.OPENAI_MODEL),
    schema: Schema,
    prompt: [
      'Create a lightweight editorial BACKGROUND image for an Instagram carousel slide.',
      'Format: 4:5 portrait (1080x1350).',
      'Do NOT include any readable text, letters, numbers, or logos.',
      'Avoid ultra-detailed photorealism; keep it cinematic, stylized, and fast to render.',
      `Palette: ${theme?.palette || ''}.`,
      `Lighting: ${theme?.lighting || ''}.`,
      `Texture: ${theme?.texture || ''}.`,
      `Composition: ${theme?.composition || ''}.`,
      `Imagery theme: ${theme?.imageryTheme || ''}.`,
      `Slide ${index + 1}/${total} narrative beat: ${beat}.`,
      'Keep generous negative space for headline and summary overlays.',
    ].join(' '),
  });

  const size = quality === 'cover' ? '1024x1536' : '768x1024';
  const img = await generateImage(env.OPENAI_API_KEY, promptRes.object.prompt, size);

  return new Response(
    JSON.stringify({ slideId, imageUrl: img.imageUrl, error: img.error || null }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
