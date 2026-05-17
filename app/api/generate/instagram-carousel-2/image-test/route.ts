import { z } from 'zod';
import { getServerEnv } from '@/lib/env';

const BodySchema = z.object({
  prompt: z.string().min(1),
  size: z.enum(['1024x1024', '1024x1536', '1536x1024', '1080x1440']).optional(),
  model: z.enum(['gpt-image-2', 'gpt-image-1']).optional(),
  panelCount: z.enum(['2', '3']).optional(),
});

async function generateImage(
  apiKey: string,
  args: { prompt: string; size: '1024x1536' | '1536x1024' | '1024x1024'; model: 'gpt-image-2' | 'gpt-image-1' }
) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: args.model,
      prompt: args.prompt,
      size: args.size,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { imageUrl: null as string | null, error: data?.error?.message || `Image API error (${res.status})`, details: data };
  }

  const first = data?.data?.[0];
  if (first?.url) return { imageUrl: first.url as string };
  if (first?.b64_json) return { imageUrl: `data:image/png;base64,${first.b64_json}` };
  return { imageUrl: null as string | null, error: 'Image API returned no image payload', details: data };
}

export async function POST(req: Request) {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY on server' }), { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const size = parsed.data.size || '1080x1440';
  const model = parsed.data.model || 'gpt-image-2';
  const panelCount = (parsed.data.panelCount || '3') as '2' | '3';

  const panelSpec = panelCount === '3'
    ? [
        'Layout spec: split the canvas into exactly three equal horizontal panels stacked vertically (each panel height = 480px).',
        'Add two solid divider lines between panels: full-width, perfectly straight, thickness 8px, color #111111 at 70% opacity.',
      ].join(' ')
    : [
        'Layout spec: split the canvas into exactly two equal horizontal panels stacked vertically (each panel height = 720px).',
        'Add one solid divider line between panels: full-width, perfectly straight, thickness 8px, color #111111 at 70% opacity.',
      ].join(' ');

  const consistencySpec = [
    'Canvas: 1080x1440 portrait.',
    panelSpec,
    'Inside each panel, keep 48px padding; no elements crossing divider lines.',
    'Each panel must be a self-contained background with a clear focal point.',
    'Maintain the same art direction across all panels (palette/texture/lighting), but vary the scene content.',
    'Do NOT use device mockups, tilted frames, collage layouts, or rounded-corner cards inside the image.',
    'Do NOT include any readable text, letters, numbers, logos, or watermarks.',
    'Do not place grain/noise on divider lines; keep dividers crisp and high-contrast for machine splitting.',
  ].join(' ');

  const promptWithLayout = `${parsed.data.prompt}\n\n${consistencySpec}`.trim();

  const out = await generateImage(env.OPENAI_API_KEY, { prompt: promptWithLayout, size, model });

  return new Response(
    JSON.stringify({
      imageUrl: out.imageUrl,
      error: out.error || null,
      promptUsed: promptWithLayout,
      sizeUsed: size,
      modelUsed: model,
      panelCount,
    }),
    { status: out.error ? 502 : 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
