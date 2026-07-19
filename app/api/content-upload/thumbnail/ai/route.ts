import { NextRequest, NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env';
import { normalizeGenerationUsage, recordGenerationEvent } from '@/lib/generation-events';
import { uploadContentThumbnail } from '@/lib/content-upload/thumbnail-storage';

function cleanText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildThumbnailPrompt(body: any) {
  const title = cleanText(body?.title) || 'Custom content';
  const summary = cleanText(body?.summary);
  const designation = cleanText(body?.contentDesignation);
  const tags = Array.isArray(body?.tags) ? body.tags.map(cleanText).filter(Boolean).slice(0, 3) : [];
  const bodyText = cleanText(body?.bodyText).slice(0, 1200);

  return [
    'Create a polished editorial thumbnail for a financial-services content library.',
    'Format target: 16:9 web thumbnail. No text, no logos, no watermarks, no UI screenshots.',
    'Style: modern professional editorial illustration, clear financial context, warm human-centered composition, clean lighting.',
    'Avoid fear-based imagery, currency piles, exaggerated charts, or regulator/brand marks.',
    `Title: ${title}`,
    summary ? `Summary: ${summary}` : '',
    designation ? `Designation: ${designation}` : '',
    tags.length ? `Approved tags: ${tags.join(', ')}` : '',
    bodyText ? `Source context: ${bodyText}` : '',
  ].filter(Boolean).join('\n');
}

async function imageBufferFromResponse(data: any) {
  const first = data?.data?.[0];
  if (first?.b64_json) return Buffer.from(String(first.b64_json), 'base64');

  if (first?.url) {
    const response = await fetch(first.url);
    if (!response.ok) throw new Error('Failed to download generated thumbnail.');
    return Buffer.from(await response.arrayBuffer());
  }

  throw new Error('Image API returned no thumbnail payload.');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const prompt = buildThumbnailPrompt(body);
    const env = getServerEnv();
    const model = 'gpt-image-1';

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        size: '1536x1024',
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error?.message || `Image API error (${response.status})`);
    }

    const generatedBuffer = await imageBufferFromResponse(data);
    const thumbnail = await uploadContentThumbnail({
      buffer: generatedBuffer,
      source: 'ai',
      filenameBase: cleanText(body?.title) || 'ai-thumbnail',
    });

    await recordGenerationEvent({
      tool: 'content-upload',
      contentType: 'thumbnail',
      category: 'image',
      assetCount: 1,
      model,
      meta: {
        mode: 'ai-thumbnail',
        prompt,
        ...normalizeGenerationUsage(data?.usage),
      },
    });

    return NextResponse.json({
      thumbnail: {
        ...thumbnail,
        source: 'ai',
        prompt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create AI thumbnail.' }, { status: 500 });
  }
}
