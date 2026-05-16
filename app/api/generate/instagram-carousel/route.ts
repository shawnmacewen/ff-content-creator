import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getServerEnv } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';

function pickVariantSeed(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

const CAROUSEL_STYLES = [
  'premium fintech editorial aesthetic, soft purple gradients, subtle grain, rounded shapes',
  'minimal editorial layout, soft violet gradient background, calm, trustworthy, modern',
  'clean poster design, purple-to-lavender gradient, light texture, lots of whitespace',
] as const;

function buildSlideImagePrompt(args: { headline: string; summary: string; index: number; total: number }) {
  const seed = pickVariantSeed(`${args.headline}|${args.summary}`);
  const style = CAROUSEL_STYLES[seed % CAROUSEL_STYLES.length];
  return [
    'Create an Instagram carousel slide image in 4:5 portrait ratio (1080x1350).',
    'This is for a financial services brand. Must be compliant: no performance guarantees, no promissory language.',
    `Style: ${style}.`,
    'Include tasteful, minimal iconography or abstract shapes. No logos, no watermarks.',
    'IMPORTANT: Do NOT render any readable text in the image (no text overlays).',
    `Slide context (for composition only): Slide ${args.index + 1}/${args.total}.`,
    `Headline intent: ${args.headline}.`,
    `Summary intent: ${args.summary}.`,
  ].join(' ');
}

async function generateSlideImage(apiKey: string, prompt: string) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1536',
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
  const body = await req.json();
  const { sourceContentIds, slideCount = 6 } = body as { sourceContentIds: string[]; slideCount?: number };

  const env = getServerEnv();
  const supabase = getSupabaseServerClient();
  let sourceText = '';

  if (sourceContentIds?.length) {
    const { data, error } = await supabase
      .from('source_content')
      .select('id,title,author,body')
      .in('id', sourceContentIds);

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    if (data?.length) {
      sourceText = data.map((c) => `Title: ${c.title}\nAuthor: ${c.author || 'Unknown'}\n\n${c.body}`).join('\n\n---\n\n');
    }
  }

  if (!sourceText) {
    return new Response(JSON.stringify({ error: 'No source content selected' }), { status: 400 });
  }

  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
  const count = Math.min(6, Math.max(3, Number(slideCount) || 6));

  const system =
    'You are an expert editorial social strategist for a fintech brand. Output must be accurate, compliant, and concise.';

  const prompt = [
    'From the source article, generate an Instagram carousel plan.',
    `Return exactly ${count} slides as JSON with keys: slides (array).`,
    'Each slide must have: headline (max 7 words), summary (max 22 words).',
    'The final slide should include a clear CTA in the summary (no guarantees).',
    'Also return: caption (max 1200 chars) with optional hashtag line.',
    'Return ONLY valid JSON.',
    'SOURCE:\n' + sourceText.slice(0, 12000),
  ].join('\n\n');

  const text = await generateText({
    model: openai(env.OPENAI_MODEL),
    system,
    prompt,
    maxOutputTokens: 1200,
    temperature: 0.5,
  });

  let parsed: any = null;
  try {
    parsed = JSON.parse(text.text);
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse model JSON output', raw: text.text.slice(0, 2000) }), { status: 500 });
  }

  const slidesIn: Array<{ headline: string; summary: string }> = Array.isArray(parsed?.slides) ? parsed.slides : [];
  const slides = slidesIn.slice(0, count).map((s, idx) => ({
    id: `slide-${idx + 1}`,
    headline: String(s?.headline || `Slide ${idx + 1}`),
    summary: String(s?.summary || ''),
  }));

  const caption = String(parsed?.caption || '').trim();

  // Generate images per slide
  const images: Array<{ slideId: string; imageUrl: string | null; error?: string }> = [];
  for (let i = 0; i < slides.length; i += 1) {
    const s = slides[i];
    const imgPrompt = buildSlideImagePrompt({ headline: s.headline, summary: s.summary, index: i, total: slides.length });
    const img = await generateSlideImage(env.OPENAI_API_KEY, imgPrompt);
    images.push({ slideId: s.id, imageUrl: img.imageUrl, error: img.error });
  }

  return new Response(
    JSON.stringify({ slides, images, caption }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
