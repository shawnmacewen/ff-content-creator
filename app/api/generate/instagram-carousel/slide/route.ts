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

function buildBackgroundPrompt(args: {
  theme: any;
  index: number;
  total: number;
  beat: string;
}) {
  // Lightweight background imagery: consistent motif + moody gradients + subtle texture.
  // NO readable text: UI overlays text.
  const seed = pickVariantSeed(`${args.theme?.title || 'theme'}|${args.index}`);
  const variants = [
    'soft purple gradient with subtle grain and abstract market shapes',
    'cinematic moody violet/indigo gradient with light chart-like lines',
    'minimal editorial background with overlay textures and gentle vignetting',
  ];
  const variant = variants[seed % variants.length];

  return [
    'Create a lightweight editorial BACKGROUND image for an Instagram carousel slide.',
    'Format: 4:5 portrait (1080x1350).',
    'Do NOT include any readable text, letters, numbers, or logos.',
    'Avoid ultra-detailed photorealism; keep it cinematic, stylized, and fast to render.',

    `Master visual direction (must stay consistent across slides):`,
    `Palette: ${args.theme?.palette || ''}.`,
    `Typography vibe: ${args.theme?.typography || ''}. (No text rendered here.)`,
    `Lighting: ${args.theme?.lighting || ''}.`,
    `Texture: ${args.theme?.texture || ''}.`,
    `Composition: ${args.theme?.composition || ''}.`,
    `Imagery theme: ${args.theme?.imageryTheme || ''}.`,

    `Slide ${args.index + 1}/${args.total} narrative beat: ${args.beat}.`,
    `Background variation: ${variant}.`,
    'Keep generous negative space for headline and summary overlays.',
  ].join(' ');
}

async function generateImage(apiKey: string, prompt: string, size: '1024x1536' | '768x1024') {
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
  const { theme, masterPlate, slideId, index, total, beat, quality = 'fast' } = body as {
    theme: any;
    masterPlate?: string | null;
    slideId: string;
    index: number;
    total: number;
    beat: string;
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

      const outBuf = await resized.extract({ left, top: 0, width: Math.min(targetW, width), height: targetH }).png().toBuffer();
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
    prompt: buildBackgroundPrompt({ theme, index, total, beat }),
  });

  const size = quality === 'cover' ? '1024x1536' : '768x1024';
  const img = await generateImage(env.OPENAI_API_KEY, promptRes.object.prompt, size);

  return new Response(
    JSON.stringify({ slideId, imageUrl: img.imageUrl, error: img.error || null }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
