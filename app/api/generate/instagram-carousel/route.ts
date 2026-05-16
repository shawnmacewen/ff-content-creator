import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
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

function buildSlideImagePrompt(args: {
  theme: {
    title: string;
    palette: string;
    typography: string;
    imagery: string;
    layout: string;
    textures: string;
  };
  headline: string;
  summary: string;
  index: number;
  total: number;
}) {
  return [
    'Create an Instagram carousel slide image in 4:5 portrait ratio (1080x1350).',
    'This is for a financial services brand. Must be compliant: no performance guarantees, no promissory language.',

    // Cohesion across the whole carousel
    'CRITICAL: This slide must match the SAME visual system as all other slides in this carousel.',
    `Carousel theme title: ${args.theme.title}.`,
    `Color palette (consistent across slides): ${args.theme.palette}.`,
    `Typography system (consistent): ${args.theme.typography}.`,
    `Imagery style (consistent): ${args.theme.imagery}.`,
    `Layout language (consistent): ${args.theme.layout}.`,
    `Textures/overlays (consistent): ${args.theme.textures}.`,

    // Narrative progression
    `Slide ${args.index + 1} of ${args.total}. This slide should feel like the next beat in one cohesive editorial story.`,

    // On-slide text guidance (we want designed typography)
    'Include readable, high-quality typography.',
    'Use ONE large editorial headline and optionally 1 short supporting line (minimal text).',
    'Keep spacing consistent. Avoid clutter. Avoid generic infographic templates.',
    'No logos, no watermarks.',

    `Headline text to render: "${args.headline}"`,
    `Supporting line (optional): "${args.summary}"`,

    'Cinematic premium fintech aesthetic: moody gradients, tasteful overlays, subtle chart/graphic elements when appropriate.',
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
  if (!env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY on server' }), { status: 500 });
  }
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

  const OutSchema = z.object({
    slides: z.array(
      z.object({
        headline: z.string().min(1),
        summary: z.string().min(1),
      })
    ),
    // Must be present to satisfy OpenAI response_format json-schema requirements
    caption: z.string(),
  });

  const result = await generateObject({
    model: openai(env.OPENAI_MODEL),
    schema: OutSchema,
    prompt: [
      'You are an expert editorial social strategist for a fintech brand.',
      'From the source article, generate an Instagram carousel plan.',
      `Return exactly ${count} slides.`,
      'Each slide should build narratively on the previous slide:',
      'Hook/Cover → Core Problem → Supporting Insight/Data → Market Impact → Broader Implications → CTA/What to Watch.',
      'Each slide:',
      '- headline: max 7 words (strong editorial headline)',
      '- summary: max 22 words (minimal, impactful)',
      'The final slide summary must include a clear CTA (no guarantees).',
      'Also return caption (max 1200 chars) with optional hashtag line.',
      'SOURCE:\n' + sourceText.slice(0, 12000),
    ].join('\n'),
  });

  const slidesIn = (result.object.slides || []).slice(0, count);
  const slides = slidesIn.map((s, idx) => ({
    id: `slide-${idx + 1}`,
    headline: String(s.headline || `Slide ${idx + 1}`),
    summary: String(s.summary || ''),
  }));

  const caption = String(result.object.caption || '').trim();

  // Generate a single cohesive theme used across ALL slides
  const ThemeSchema = z.object({
    title: z.string(),
    palette: z.string(),
    typography: z.string(),
    imagery: z.string(),
    layout: z.string(),
    textures: z.string(),
  });

  const themeRes = await generateObject({
    model: openai(env.OPENAI_MODEL),
    schema: ThemeSchema,
    prompt: [
      'Design a cohesive visual system for an Instagram carousel for a premium fintech/editorial brand.',
      'It must feel cinematic, modern, and highly polished (Apple keynote / Bloomberg graphics vibes).',
      'Return a compact style guide as JSON fields:',
      '- title',
      '- palette (moody gradients, soft purples, neutrals)',
      '- typography (headline style, font vibe, sizing rules)',
      '- imagery (photography/abstract blend guidance)',
      '- layout (grid, margins, hierarchy)',
      '- textures (grain, overlays, chart accents)',
      'Keep it consistent across 3–6 slides.',
    ].join('\n'),
  });

  const theme = themeRes.object;

  // Generate images per slide (all share the same theme)
  const images: Array<{ slideId: string; imageUrl: string | null; error?: string }> = [];
  for (let i = 0; i < slides.length; i += 1) {
    const s = slides[i];
    const imgPrompt = buildSlideImagePrompt({ theme, headline: s.headline, summary: s.summary, index: i, total: slides.length });
    const img = await generateSlideImage(env.OPENAI_API_KEY, imgPrompt);
    images.push({ slideId: s.id, imageUrl: img.imageUrl, error: img.error });
  }

  return new Response(
    JSON.stringify({ slides, images, caption }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
