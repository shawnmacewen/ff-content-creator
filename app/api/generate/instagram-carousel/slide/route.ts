import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { CAROUSEL_TEMPLATES, pickCarouselTemplate } from '@/lib/generator/carousel-templates';


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
  const { theme, masterPlate, style = 'purple-gold', template: templateIn = 'standard', slideId, index, total, beat, motif, imageryMotif, placement = 'right', quality = 'fast' } = body as {
    theme: any;
    masterPlate?: string | null;
    style?: 'purple-gold' | 'frost';
    template?: 'intro' | 'standard' | 'outro';
    slideId: string;
    index: number;
    total: number;
    beat: string;
    motif?: string;
    imageryMotif?: string;
    placement?: 'left' | 'right' | 'center' | 'bottom-left' | 'bottom-right';
    quality?: 'fast' | 'cover';
  };

  const Schema = z.object({
    // One compact prompt string to send to the image model.
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

  const template = pickCarouselTemplate(index, total) || templateIn;
  const templateSpec = CAROUSEL_TEMPLATES[template] || CAROUSEL_TEMPLATES.standard;

  // Fallback: Derive prompt via model so we can keep the art direction consistent and concise.
  const templateHint = templateSpec.promptHints.background;

  // Style-level override: purple-gold benefits from a slightly more concrete/editorial look
  // to avoid drifting into pastel gradients/haze.
  const effectiveImageStyle = style === 'purple-gold'
    ? (template === 'standard' ? 'abstract' : 'realistic')
    : (templateSpec.promptHints.imageStyle || 'abstract');

  const imageStyleHint = effectiveImageStyle === 'realistic'
    ? 'Image style: semi-realistic premium editorial (not photorealistic; crisp detail; recognizable fintech cues).'
    : 'Image style: stylized/abstract editorial (not photorealistic).';

  const promptRes = await generateObject({
    model: openai(env.OPENAI_MODEL),
    schema: Schema,
    prompt: [
      'You are writing a single, compact prompt for an image generation model.',
      'Output format rules:',
      '- Return ONLY the prompt text as one paragraph (no markdown, no headings, no bullet lists).',
      '- Keep it consistent in density across slides; aim ~60–110 words.',
      '- Be specific but not verbose.',
      '',
      'Image requirements:',
      'Create a lightweight editorial BACKGROUND image for an Instagram carousel slide.',
      'Format: 4:5 portrait (1080x1350).',
      `Style variant: ${style}.`,
      `Template variant: ${template}.`,
      templateHint,
      imageStyleHint,
      style === 'frost'
        ? [
            'IMPORTANT: Frost palette ONLY.',
            'Background must be clean near-white with very light pink OR very light ice blue accents.',
            'Do NOT use purple. Do NOT use gold. Do NOT use yellow/warm lighting.',
            'Overall look: high-key, bright, crisp, minimal shadows; matte editorial paper feel.',
            'Avoid moody/dim lighting, dark gradients, heavy texture, or dark vignettes.',
            'Keep a large, clearly-defined negative-space block for BLACK text overlays.',
            'No obvious finance charts/candlesticks as the main subject; keep any geometry minimal and abstract.',
          ].join(' ')
        : template === 'standard'
          ? [
              'IMPORTANT: Purple+Gold palette, but LIGHT / near-white background (paper-white / frosted white).',
              'Use subtle purple and warm gold accents only (no heavy dark fields).',
              'Overall look: bright, clean, airy, minimal shadows — inspired by Frost, but with purple+gold accents.',
              'Contrast: ensure BLACK overlay text will be readable (keep the main text area very light and uncluttered).',
              'Sharpness: crisp detail; no haze; no soft-focus; no gaussian blur; no foggy glow.',
              'Imagery: subtle but recognizable finance elements (fine line chart, faint candlestick pattern, minimal coin/bar silhouettes), tasteful and editorial.',
              'Composition: preserve a clean negative-space block in the TOP portion for text; keep the rest cohesive and premium (not an amorphous gradient).',
            ].join(' ')
          : template === 'intro'
            ? [
                'IMPORTANT: Purple+Gold palette only (deep royal purple + warm gold accents + neutral grays).',
                'Overall look: low-key / darker exposure with deep navy/purple shadows (NOT pastel).',
                'Contrast: higher contrast so white overlay text stays readable (lower third stays clean).',
                'Sharpness: crisp detail; no haze; no soft-focus; no gaussian blur; no foggy glow.',
                'Imagery: strongest establishing finance focal element (tasteful editorial).',
                'Composition: hero/cover composition; clear focal point; maintain clean lower third for overlays.',
              ].join(' ')
            : [
                'IMPORTANT: Purple+Gold palette only (deep royal purple + warm gold accents + neutral grays).',
                'Overall look: low-key / darker exposure with deep navy/purple shadows (NOT pastel).',
                'Contrast: high, but keep the TOP portion cleaner for overlays.',
                'Sharpness: crisp detail; no haze; no soft-focus; no gaussian blur; no foggy glow.',
                'Imagery: calmer CTA-friendly finance cues; avoid busy focal elements.',
                'Composition: cleanest overlay area; slightly calmer; avoid clutter.',
              ].join(' '),
      'Do NOT include any readable text, letters, numbers, or logos.',
      'No watermarks. No frames. No borders. No vignettes. No dark edge banding.',
      'Avoid ultra-detailed photorealism; keep it premium editorial, fast to render.',
      style === 'frost'
        ? ''
        : 'For purple-gold: avoid overexposure, blown highlights, pastel gradients, lens bloom, volumetric light, vignette-y edge burn, and any smeary/airbrushed look. Keep edges clean; avoid overly abstract swirls that reduce legibility.',
      `Palette: ${style === 'frost' ? 'clean whites + very light pink or ice blue accents' : (theme?.palette || 'soft purples with warm gold accents and neutral grays')}.`,
      `Lighting: ${style === 'frost' ? 'bright soft diffuse, even edges' : (theme?.lighting || 'soft cinematic')}.`,
      `Texture: ${style === 'frost' ? 'minimal grain, clean matte' : (theme?.texture || 'subtle grain')}.`,
      `Composition: ${style === 'frost' ? 'airy negative space, minimal clutter' : (theme?.composition || 'premium editorial negative space')}.`,
      `Imagery theme: ${theme?.imageryTheme || ''}.`,
      imageryMotif ? `Topic imagery motif (use these concrete elements): ${imageryMotif}.` : '',
      // Keep fintech cues present but subordinate to the topic; do not force charts every time.
      style === 'frost'
        ? ''
        : 'Fintech accent (subtle, optional): one small finance cue only if it fits (tiny chart line, subtle candlestick texture, or minimal ticker-like geometry) — do not make the whole image a chart.',
      `Slide ${index + 1}/${total} narrative beat: ${beat}.`,
      style === 'frost'
        ? 'Keep the lower third clean and light for dark headline/summary overlays.'
        : template === 'standard'
          ? 'Keep the TOP portion clean and light for dark headline/summary overlays.'
          : template === 'intro'
            ? 'Keep the lower third clean for headline and summary overlays.'
            : 'Keep the TOP portion cleaner for headline and summary overlays.',
    ].filter(Boolean).join(' '),
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
