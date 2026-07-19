import { getServerEnv } from '@/lib/env';
import { normalizeGenerationUsage, recordGenerationEvent } from '@/lib/generation-events';

function buildInfographicPrompt(args: {
  infographicCopy: string;
  guidance?: string;
}) {
  return [
    'Create one polished website-ready infographic image for a financial services editorial team.',
    'Format: landscape website infographic, 1536x1024, suitable for embedding in a web page or landing-page content section.',
    '',
    'Use the provided infographic copy as the source of truth.',
    'Render a complete single infographic, not a carousel, not a social post, not a mockup.',
    '',
    'Design requirements:',
    '- Premium editorial fintech look, similar quality bar to a polished Instagram carousel slide system.',
    '- Clear hierarchy: one strong headline, 4-6 concise content blocks, and one closing CTA or takeaway.',
    '- Use readable typography and generous spacing; avoid tiny dense paragraphs.',
    '- Create a rich but professional full-canvas background that complements the topic: layered panels, subtle gradients, editorial textures, soft geometric fields, data-grid details, or abstract financial/planning motifs.',
    '- The background should feel intentionally designed, not plain white or generic. Keep enough contrast behind every text area so the copy remains easy to read.',
    '- Use background depth, section bands, dividers, and visual rhythm to make the infographic feel website-ready and polished.',
    '- Include subtle charts, icons, diagrams, or visual motifs only when they help explain the copy.',
    '- Website orientation: wider and more spacious than social media assets.',
    '- No logos, no watermarks, no fake brand marks.',
    '- Do not invent statistics, percentages, dates, returns, guarantees, or claims not present in the copy.',
    '- Keep financial-services compliance posture conservative: educational, no promises, no fearmongering.',
    '',
    args.guidance ? `Additional guidance: ${args.guidance}` : '',
    '',
    'INFOGRAPHIC COPY:',
    args.infographicCopy.slice(0, 6000),
  ].filter(Boolean).join('\n');
}

async function generateInfographicImage(apiKey: string, prompt: string) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1536x1024',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { imageUrl: null as string | null, error: data?.error?.message || `Image API error (${res.status})` };
  }

  const first = data?.data?.[0];
  if (first?.url) return { imageUrl: first.url as string, usage: data?.usage };
  if (first?.b64_json) return { imageUrl: `data:image/png;base64,${first.b64_json}`, usage: data?.usage };
  return { imageUrl: null as string | null, error: 'Image API returned no image payload' };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const infographicCopy = String(body?.infographicCopy || '').trim();
    const sourceContentIds = Array.isArray(body?.sourceContentIds) ? body.sourceContentIds.map(String).filter(Boolean) : [];
    const guidance = String(body?.guidance || '').trim();
    const generationGroupId = String(body?.generationGroupId || '').trim() || undefined;

    if (!infographicCopy) {
      return new Response(JSON.stringify({ error: 'Infographic Copy is required before generating an infographic image.' }), { status: 400 });
    }

    const env = getServerEnv();
    if (!env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY on server' }), { status: 500 });
    }

    const prompt = buildInfographicPrompt({ infographicCopy, guidance });
    const image = await generateInfographicImage(env.OPENAI_API_KEY, prompt);
    if (!image.imageUrl) {
      return new Response(JSON.stringify({ error: image.error || 'Infographic image generation failed' }), { status: 500 });
    }

    await recordGenerationEvent({
      tool: 'image-generation',
      contentType: 'infographic',
      category: 'image',
      assetCount: 1,
      model: 'gpt-image-1',
      generationGroupId,
      meta: {
        source: 'generate-content-kit',
        sourceContentCount: sourceContentIds.length,
        ...normalizeGenerationUsage(image.usage),
      },
    });

    return new Response(
      JSON.stringify({ imageUrl: image.imageUrl, prompt }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Infographic image generation failed' }), { status: 500 });
  }
}
