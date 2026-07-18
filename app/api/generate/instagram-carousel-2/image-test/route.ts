import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { normalizeGenerationUsage, recordGenerationEvent } from '@/lib/generation-events';

const ReferenceImageUrlSchema = z.string().refine(
  (value) => value.startsWith('data:image/') || /^https?:\/\//i.test(value),
  'referenceImageUrl must be an image data URL or an http(s) URL'
);

const BodySchema = z.object({
  prompt: z.string().min(1),
  // NOTE: OpenAI Images sizes must be divisible by 16.
  size: z.enum(['1024x1024', '1024x1536', '1536x1024', '1536x512', '1024x512', '512x512']).optional(),
  model: z.enum(['gpt-image-2', 'gpt-image-1']).optional(),
  // Optional reference image to drive cohesion across masterplates.
  // Accepts either a data: URL (data:image/png;base64,...) or an http(s) URL.
  referenceImageUrl: ReferenceImageUrlSchema.optional(),
});

async function fetchImageBytes(url: string): Promise<Uint8Array> {
  if (url.startsWith('data:')) {
    const m = url.match(/^data:([^;]+);base64,(.*)$/);
    if (!m) throw new Error('Invalid data URL for referenceImageUrl');
    const b64 = m[2] || '';
    return Uint8Array.from(Buffer.from(b64, 'base64'));
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch reference image (${res.status})`);
  const ab = await res.arrayBuffer();
  return new Uint8Array(ab);
}

async function generateImage(
  apiKey: string,
  args: {
    prompt: string;
    size: '1024x1536' | '1536x1024' | '1024x1024' | '1536x512' | '1024x512' | '512x512';
    model: 'gpt-image-2' | 'gpt-image-1';
    referenceImageUrl?: string;
  }
) {
  // If a reference image is provided, use image edits to bias the generation toward that image.
  // (This enables “Image Reference Cohesion” across masterplates.)
  if (args.referenceImageUrl) {
    const imgBytes = await fetchImageBytes(args.referenceImageUrl);

    const form = new FormData();
    form.set('model', args.model);
    form.set('prompt', args.prompt);
    form.set('size', args.size);

    // OpenAI image edits expects an image file in multipart form data.
    const blob = new Blob([imgBytes], { type: 'image/png' });
    form.set('image', blob, 'reference.png');

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { imageUrl: null as string | null, error: data?.error?.message || `Image API error (${res.status})`, details: data };
    }

    const first = data?.data?.[0];
    if (first?.url) return { imageUrl: first.url as string, usage: data?.usage };
    if (first?.b64_json) return { imageUrl: `data:image/png;base64,${first.b64_json}`, usage: data?.usage };
    return { imageUrl: null as string | null, error: 'Image API returned no image payload', details: data };
  }

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
  if (first?.url) return { imageUrl: first.url as string, usage: data?.usage };
  if (first?.b64_json) return { imageUrl: `data:image/png;base64,${first.b64_json}`, usage: data?.usage };
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

  const size = parsed.data.size || '1024x1536';
  const model = parsed.data.model || 'gpt-image-2';
  const out = await generateImage(env.OPENAI_API_KEY, {
    prompt: parsed.data.prompt,
    size,
    model,
    referenceImageUrl: parsed.data.referenceImageUrl,
  });

  if (out.imageUrl) {
    await recordGenerationEvent({
      tool: 'image-test',
      contentType: 'instagram-carousel-image-test',
      category: 'image',
      assetCount: 1,
      model,
      meta: {
        route: 'instagram-carousel-2-image-test',
        size,
        usedReferenceImage: Boolean(parsed.data.referenceImageUrl),
        ...normalizeGenerationUsage(out.usage),
      },
    });
  }

  return new Response(
    JSON.stringify({
      imageUrl: out.imageUrl,
      error: out.error || null,
      promptUsed: parsed.data.prompt,
      sizeUsed: size,
      modelUsed: model,
    }),
    { status: out.error ? 502 : 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
