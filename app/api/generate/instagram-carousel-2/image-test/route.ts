import { z } from 'zod';
import { getServerEnv } from '@/lib/env';

const BodySchema = z.object({
  prompt: z.string().min(1),
  // NOTE: OpenAI Images sizes must be divisible by 16.
  size: z.enum(['1024x1024', '1024x1536', '1536x1024']).optional(),
  model: z.enum(['gpt-image-2', 'gpt-image-1']).optional(),
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

  const size = parsed.data.size || '1024x1536';
  const model = parsed.data.model || 'gpt-image-2';
  const out = await generateImage(env.OPENAI_API_KEY, { prompt: parsed.data.prompt, size, model });

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
