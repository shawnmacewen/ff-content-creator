import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { mergeGenerationUsages, recordGenerationEvent } from '@/lib/generation-events';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getCanonicalBody } from '@/lib/source-content/body';
import { findMissingSourceContentIds, missingSourceContentMessage, normalizeSourceContentIds } from '@/lib/source-content/missing';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sourceContentIds, slideCount = 6, generationMode = 'master-plate', style = 'purple-gold' } = body as {
      sourceContentIds: string[];
      slideCount?: number;
      generationMode?: 'master-plate' | 'sequential';
      style?: 'purple-gold' | 'frost';
    };
    const requestedSourceContentIds = normalizeSourceContentIds(sourceContentIds);

    const env = getServerEnv();
    if (!env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY on server' }), { status: 500 });
    }

    const supabase = getSupabaseServerClient();
    let sourceText = '';
    let missingSourceContentCount = 0;

    if (requestedSourceContentIds.length) {
      const { data, error } = await supabase
        .from('source_content')
        .select('id,title,author,body_text,body')
        .in('id', requestedSourceContentIds);

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      const missingSourceContentIds = findMissingSourceContentIds(requestedSourceContentIds, data);
      missingSourceContentCount = missingSourceContentIds.length;
      if (missingSourceContentIds.length === requestedSourceContentIds.length) {
        return new Response(JSON.stringify({
          error: missingSourceContentMessage(missingSourceContentIds.length, requestedSourceContentIds.length),
          missingSourceContent: true,
          missingSourceContentIds,
        }), { status: 409, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      }
      if (data?.length) {
        sourceText = data.map((c) => `Title: ${c.title}\nAuthor: ${c.author || 'Unknown'}\n\n${getCanonicalBody(c)}`).join('\n\n---\n\n');
      }
    }

    if (!sourceText) {
      return new Response(JSON.stringify({ error: 'No available source content selected', missingSourceContent: requestedSourceContentIds.length > 0 }), { status: 400 });
    }

    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const count = Math.min(6, Math.max(3, Number(slideCount) || 6));

  const ThemeSchema = z.object({
    title: z.string(),
    // 1–2 sentence plain-English gist of the source content (to feed into image prompts)
    sourceGist: z.string(),
    palette: z.string(),
    typography: z.string(),
    lighting: z.string(),
    texture: z.string(),
    composition: z.string(),
    imageryTheme: z.string(),
  });

  // New: campaign-level art direction object (single cohesive creative direction)
  const CreativeDirectionSchema = z.object({
    theme: z.string(),
    palette: z.array(z.string().min(1)),
    typography: z.string(),
    overlayStyle: z.string(),
    imageryStyle: z.string(),
    layoutLanguage: z.string(),
    mood: z.string(),
    textures: z.string(),
    branding: z.object({
      logoMode: z.enum(['none', 'mark', 'wordmark']),
      placement: z.enum(['bottom-left', 'bottom-right', 'top-left', 'top-right']),
    }),
  });

  const SlideSchema = z.object({
    // Storyboard fields
    role: z.enum(['hook', 'context', 'insight', 'evidence', 'example', 'impact', 'cta']),
    headline: z.string().min(1),
    summary: z.string().min(1),
    // Outro fields: must be present for schema compliance.
    // For non-outro slides: bullets = [] and ctaLine = "".
    bullets: z.array(z.string().min(1)),
    ctaLine: z.string(),

    // Unique scene direction (drives non-repetitive imagery)
    scene: z.string().min(1),
    focalPoint: z.string().min(1),
    compositionNotes: z.string().min(1),

    // Foreground motif (optional in concept, but required in schema for consistency)
    motif: z.string().min(1),
    imageryMotif: z.string().min(1),
    visualType: z.enum(['diagram', 'chart', 'photo', 'icon', 'texture']),
    placement: z.enum(['left', 'right', 'center', 'bottom-left', 'bottom-right']),
  });

  const OutSchema = z.object({
    creativeDirection: CreativeDirectionSchema,
    slides: z.array(SlideSchema),
    caption: z.string(),
  });

  const themeRes = await generateObject({
    model: openai(env.OPENAI_MODEL),
    schema: ThemeSchema,
    prompt: [
      'Create ONE master visual direction for a premium editorial Instagram carousel.',
      `Style variant: ${style}.`,
      'Goal: cohesive Apple/Bloomberg-style editorial story across slides.',
      'Return a compact JSON style guide fields:',
      '- title',
      '- sourceGist (1–2 sentence summary of what the source content is about; plain English; no jargon)',
      '- palette',
      '- typography (headline style, font vibe, sizing rules)',
      '- lighting',
      '- texture',
      '- composition (grid/margins/hierarchy)',
      '- imageryTheme (consistent motif system derived from the source topic; avoid generic finance/market imagery unless the source is explicitly about that)',
      'If style variant is "purple-gold": palette = soft purples + warm gold accents + neutral grays. Keep it moody/low-key (deeper midtones), with clear contrast so white overlay text stays readable.',
      'If style variant is "frost": palette = cool neutrals + ice blue or very light pink accents (NO purple, NO gold).',
      'For frost: airy negative space, crisp edges, minimal grain, designed for dark (black) text overlays on standard slides.',
      'Keep it consistent and easy to apply.',
      'SOURCE:\n' + sourceText.slice(0, 4000),
    ].join('\n'),
  });

  const planRes = await generateObject({
    model: openai(env.OPENAI_MODEL),
    schema: OutSchema,
    prompt: [
      'You are an expert campaign art director and editorial social strategist.',
      'Goal: create a cohesive Instagram carousel campaign that feels professionally art-directed.',
      'Avoid dashboard cards, repeated placeholder layouts, and repeated visuals.',
      'Each slide must have a unique scene, unique composition, and unique focal point — while all slides share one visual identity.',
      '',
      'First, create ONE master campaign creativeDirection object (visual identity) that all slides share.',
      'Then, create a storyboard with exactly ' + String(count) + ' slides.',
      '',
      'For each slide include:',
      '- role (hook|context|insight|evidence|example|impact|cta)',
      '- headline (max 7 words)',
      '- summary (max 22 words; for outro can be minimal)',
      '- scene (1 sentence describing the unique scene/background concept)',
      '- focalPoint (what the eye should land on)',
      '- compositionNotes (camera angle, negative space zone, layout guidance)',
      '- imageryMotif (2–5 concrete visual nouns derived from the SOURCE topic)',
      '- visualType (diagram|chart|photo|icon|texture) as the background payload type',
      '- motif (one simple foreground icon concept; not photorealistic)',
      '- placement (left|right|center|bottom-left|bottom-right)',
      '',
      'Storyboard guidance (reference arc):',
      '- Slide 1 role=hook (dark hero mood, strongest establishing scene)',
      '- Slide 2 role=context (diagram/map/schematic feel)',
      '- Slide 3 role=evidence (supporting chart element)',
      '- Slide 4 role=example (real-world photo-like scene)',
      '- Slide 5 role=evidence (another distinct evidence scene)',
      '- Slide 6 role=impact (system/globe/network visual)',
      '- Slide 7 role=cta (outro CTA list)',
      '',
      'For the final slide (role=cta) also include:',
      '- bullets: 3 short bullet points (each max 6 words)',
      '- ctaLine: one short closing line (max 6 words)',
      'For non-cta slides: set bullets=[] and ctaLine="".',
      '',
      'Also return caption (max 1200 chars) with optional hashtag line.',
      'SOURCE:\n' + sourceText.slice(0, 12000),
    ].join('\n'),
  });

  const slides = (planRes.object.slides || []).slice(0, count).map((s, idx) => {
    const template = idx === 0 ? 'intro' : idx === count - 1 ? 'outro' : 'standard';
    return {
      id: `slide-${idx + 1}`,
      role: String((s as any).role || (idx === 0 ? 'hook' : idx === count - 1 ? 'cta' : 'insight')),
      headline: String(s.headline || `Slide ${idx + 1}`),
      summary: String(s.summary || ''),
      scene: String((s as any).scene || ''),
      focalPoint: String((s as any).focalPoint || ''),
      compositionNotes: String((s as any).compositionNotes || ''),
      motif: String((s as any).motif || 'abstract icon'),
      imageryMotif: String((s as any).imageryMotif || ''),
      visualType: String((s as any).visualType || 'texture'),
      bullets: Array.isArray((s as any).bullets) ? (s as any).bullets.map((x: any) => String(x)).filter(Boolean) : [],
      ctaLine: typeof (s as any).ctaLine === 'string' ? String((s as any).ctaLine) : '',
      placement: String((s as any).placement || 'right'),
      template,
    };
  });

  // Generate ONE master background plate (landscape) used to create connected slide pans.
  // Best-effort: if this fails, we still return theme+slides so the UI can proceed.
  let masterPlate: string | null = null;
  let masterPlateUsage: Record<string, any> | undefined;
  if (generationMode === 'master-plate') {
    try {
      const masterPrompt = [
        style === 'frost'
          ? 'Create ONE master panoramic background plate for a premium high-key editorial Instagram carousel campaign (Frost style).'
          : 'Create ONE master panoramic background plate for a premium editorial Instagram carousel campaign (Purple+Gold style).',
        style === 'frost'
          ? [
              'Landscape orientation. Near-white / frosted paper base with ice-blue or very light pink accents (make them visible, not imperceptible).',
              'Add a DISTINCT but clean editorial pattern system across the plate: topo lines / grid / contour lines / geometric shapes.',
              'Pattern lines may use medium-contrast navy/charcoal outlines (still Frost) so the pattern is visible after cropping.',
              'Use stronger contrast than before so crops still read (avoid pure-white washout).',
              'Crisp edges, minimal shadows, clean matte texture. No purple, no gold, no warm/yellow lighting.',
            ].join(' ')
          : 'Landscape orientation. Cinematic, moody gradients (soft purples), deeper exposure (avoid washed-out highlights), subtle texture/grain, restrained abstract motifs (not blurry).',
        'No readable text, no logos, no watermarks.',
        'Must have a continuous horizon/flow that can be panned across multiple slides.',
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
          model: 'gpt-image-2',
          prompt: masterPrompt,
          size: '1536x1024',
        }),
      });

      const imgData = await imgRes.json().catch(() => ({}));
      if (imgRes.ok) {
        const first = imgData?.data?.[0];
        masterPlate = first?.b64_json ? `data:image/png;base64,${first.b64_json}` : (first?.url || null);
        masterPlateUsage = imgData?.usage;
      } else {
        console.error('master plate generation failed', imgData?.error?.message || imgRes.status);
      }
    } catch (e) {
      console.error('master plate generation exception', e);
    }
  }

  await recordGenerationEvent({
    tool: 'generate-content',
    contentType: 'instagram-carousel-plan',
    category: 'content',
    assetCount: 1,
    model: env.OPENAI_MODEL,
    meta: {
      slideCount: slides.length,
      generationMode,
      style,
      sourceContentCount: requestedSourceContentIds.length - missingSourceContentCount,
      requestedSourceContentCount: requestedSourceContentIds.length,
      missingSourceContentCount,
      hasMasterPlate: Boolean(masterPlate),
      ...mergeGenerationUsages([themeRes.usage, planRes.usage]),
    },
  });

  if (masterPlate) {
    await recordGenerationEvent({
      tool: 'generate-content',
      contentType: 'instagram-carousel-master-plate',
      category: 'image',
      assetCount: 1,
      model: 'gpt-image-2',
      meta: {
        generationMode,
        style,
        slideCount: slides.length,
        ...mergeGenerationUsages([masterPlateUsage]),
      },
    });
  }

  return new Response(
    JSON.stringify({
      theme: themeRes.object,
      creativeDirection: (planRes.object as any).creativeDirection,
      slides,
      caption: String(planRes.object.caption || '').trim(),
      masterPlate,
      style,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
  } catch (err: any) {
    console.error('instagram-carousel plan error', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal error in carousel plan' }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
