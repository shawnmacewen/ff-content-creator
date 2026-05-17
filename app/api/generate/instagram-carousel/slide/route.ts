import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';


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

async function generateImage(apiKey: string, prompt: string, size: '1024x1536' | '1536x1024' | '1024x1024') {
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
  const { theme, masterPlate, style = 'purple-gold', slideId, index, total, beat, motif, placement = 'right', quality = 'fast' } = body as {
    theme: any;
    masterPlate?: string | null;
    style?: 'purple-gold' | 'frost';
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

  // Fast path: if we have a master plate, avoid server-side image processing.
  // Return the master plate + a crop position hint. The client renders it as a full-bleed background
  // using background-position-x so slides feel connected (pan across one plate).
  if (masterPlate && masterPlate.startsWith('data:image')) {
    // optional lightweight motif generation (no compositing)
    let motifUrl: string | null = null;
    if (motif) {
      const fgPrompt = buildForegroundPrompt({ theme, motif, placement, index, total });
      const fg = await generateImage(env.OPENAI_API_KEY, fgPrompt, '1024x1024');
      motifUrl = fg.imageUrl;
    }

    const denom = Math.max(1, total - 1);
    const x = Math.round((index / denom) * 100);

    return new Response(
      JSON.stringify({
        slideId,
        imageUrl: masterPlate,
        cropX: x,
        motifUrl,
        placement,
        error: null,
        promptUsed: null,
        motifPromptUsed: motif ? buildForegroundPrompt({ theme, motif, placement, index, total }) : null,
        sizeUsed: null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  // Fallback: Derive prompt via model so we can keep the art direction consistent and concise.
  const promptRes = await generateObject({
    model: openai(env.OPENAI_MODEL),
    schema: Schema,
    prompt: [
      'Create a lightweight editorial BACKGROUND image for an Instagram carousel slide.',
      'Format: 4:5 portrait (1080x1350).',
      `Style variant: ${style}.`,
      'Do NOT include any readable text, letters, numbers, or logos.',
      'No watermarks. No frames. No borders. No vignettes. No dark edge banding.',
      'Avoid ultra-detailed photorealism; keep it cinematic, stylized, and fast to render.',
      `Palette: ${style === 'frost' ? 'clean whites with very light pink OR very light ice blue accents (no purple/gold), airy high-key neutrals' : (theme?.palette || 'soft purples with warm gold accents and neutral grays')}.`,
      `Lighting: ${style === 'frost' ? 'bright soft diffuse light, high-key, even edges (no vignette)' : (theme?.lighting || 'soft cinematic')}.`,
      `Texture: ${style === 'frost' ? 'clean minimal grain, subtle matte' : (theme?.texture || 'subtle grain')}.`,
      `Composition: ${style === 'frost' ? 'airy negative space, minimal clutter, clean horizon' : (theme?.composition || 'premium editorial negative space')}.`,
      `Imagery theme: ${theme?.imageryTheme || ''}.`,
      `Slide ${index + 1}/${total} narrative beat: ${beat}.`,
      style === 'frost'
        ? 'Keep the lower third especially clean and light for DARK (black) headline/summary overlays.'
        : 'Keep generous negative space for headline and summary overlays.',
    ].join(' '),
  });

  // gpt-image-1 supported sizes: 1024x1024, 1024x1536, 1536x1024 (and "auto").
  // 4:5 portrait is best approximated by 1024x1536, then the client can crop/fit to 1080x1350.
  const size = '1024x1536';
  const promptUsed = promptRes.object.prompt;
  const img = await generateImage(env.OPENAI_API_KEY, promptUsed, size);

  return new Response(
    JSON.stringify({
      slideId,
      imageUrl: img.imageUrl,
      error: img.error || null,
      promptUsed,
      motifPromptUsed: null,
      sizeUsed: size,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
