import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';

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

  const ThemeSchema = z.object({
    title: z.string(),
    palette: z.string(),
    typography: z.string(),
    lighting: z.string(),
    texture: z.string(),
    composition: z.string(),
    imageryTheme: z.string(),
  });

  const OutSchema = z.object({
    slides: z.array(
      z.object({
        headline: z.string().min(1),
        summary: z.string().min(1),
        // Fast, consistent foreground motif per slide (e.g. "cargo ship silhouette", "country flag")
        motif: z.string().min(1),
        placement: z.enum(['left', 'right', 'center', 'bottom-left', 'bottom-right']).default('right'),
      })
    ),
    caption: z.string(),
  });

  const themeRes = await generateObject({
    model: openai(env.OPENAI_MODEL),
    schema: ThemeSchema,
    prompt: [
      'Create ONE master visual direction for a premium fintech/editorial Instagram carousel.',
      'Goal: cohesive Apple/Bloomberg-style editorial story across slides.',
      'Return a compact JSON style guide fields:',
      '- title',
      '- palette (moody gradients, soft purples, neutrals)',
      '- typography (headline style, font vibe, sizing rules)',
      '- lighting',
      '- texture',
      '- composition (grid/margins/hierarchy)',
      '- imageryTheme (consistent motif: e.g., cinematic abstract markets, macro textures, stylized finance photography)',
      'Keep it consistent and easy to apply.',
    ].join('\n'),
  });

  const planRes = await generateObject({
    model: openai(env.OPENAI_MODEL),
    schema: OutSchema,
    prompt: [
      'You are an expert editorial social strategist for a fintech brand.',
      `Generate an Instagram carousel plan with exactly ${count} slides that builds narratively:`,
      'Hook/Cover → Core Problem → Supporting Insight/Data → Market Impact → Broader Implications → CTA/What to Watch.',
      'Each slide must include:',
      '- headline: max 7 words (editorial headline)',
      '- summary: max 22 words (minimal, impactful)',
      '- motif: ONE simple visual symbol/object that represents the slide context (e.g., cargo ship, flag, oil rig, chart line, gavel).',
      '- placement: where the motif should sit (left/right/center/bottom-left/bottom-right).',
      'Motifs must be fast + consistent: simple editorial icon/illustration, not photorealism.',
      'Final slide summary must include a CTA (no guarantees).',
      'Also return caption (max 1200 chars) with optional hashtag line.',
      'SOURCE:\n' + sourceText.slice(0, 12000),
    ].join('\n'),
  });

  const slides = (planRes.object.slides || []).slice(0, count).map((s, idx) => ({
    id: `slide-${idx + 1}`,
    headline: String(s.headline || `Slide ${idx + 1}`),
    summary: String(s.summary || ''),
    motif: String((s as any).motif || 'abstract icon'),
    placement: String((s as any).placement || 'right'),
  }));

  // Generate ONE master background plate (landscape) used to create connected slide crops
  const masterPrompt = [
    'Create ONE master panoramic background plate for a premium fintech/editorial Instagram carousel campaign.',
    'Landscape orientation. Cinematic, moody gradients (soft purples), subtle texture/grain, abstract market motifs.',
    'No readable text, no logos, no watermarks.',
    'Must have a continuous horizon/flow that can be panned/cropped across multiple slides.',
    `Palette: ${themeRes.object.palette}.`,
    `Lighting: ${themeRes.object.lighting}.`,
    `Texture: ${themeRes.object.texture}.`,
    `Imagery theme: ${themeRes.object.imageryTheme}.`,
  ].join(' ');

  const imgRes = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: masterPrompt,
      size: '1536x1024',
    }),
  });

  const imgData = await imgRes.json().catch(() => ({}));
  if (!imgRes.ok) {
    return new Response(
      JSON.stringify({ error: imgData?.error?.message || `Master plate image API error (${imgRes.status})` }),
      { status: 500 }
    );
  }

  const first = imgData?.data?.[0];
  const masterPlate = first?.b64_json ? `data:image/png;base64,${first.b64_json}` : (first?.url || null);

  return new Response(
    JSON.stringify({
      theme: themeRes.object,
      slides,
      caption: String(planRes.object.caption || '').trim(),
      masterPlate,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
