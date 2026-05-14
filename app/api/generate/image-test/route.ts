import { NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = body?.prompt || 'a simple cute cat illustration, flat colors';

    const env = getServerEnv();

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1024x1024',
      }),
    });

    const data = await res.json().catch(() => ({}));
    const first = data?.data?.[0] || {};

    const derivedImageUrl = first?.url || (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : null);

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      hasUrl: Boolean(first?.url),
      hasB64: Boolean(first?.b64_json),
      imageUrl: derivedImageUrl,
      b64Prefix: first?.b64_json ? String(first.b64_json).slice(0, 24) : null,
      error: data?.error || null,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'image-test failed' }, { status: 500 });
  }
}
