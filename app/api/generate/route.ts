import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/ai/prompts';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getServerEnv } from '@/lib/env';
import type { ContentType, ToneType } from '@/lib/types/content';

function assessCompliance(text: string) {
  const checks = [
    { regex: /\b\d+(?:\.\d+)?%\b/g, risk: 2, note: 'Contains percentage claims/yield language' },
    { regex: /\bguarantee(?:d)?\b|\brisk[-\s]?free\b/gi, risk: 3, note: 'Contains guaranteed/risk-free language' },
    { regex: /\bbest\b|\btop performing\b|\boutperform\b/gi, risk: 1, note: 'Contains promissory/superlative performance language' },
    { regex: /\bSEC\s+approved\b|\bFINRA\s+approved\b/gi, risk: 3, note: 'Implied regulator endorsement' },
  ];

  let score = 0;
  const findings: string[] = [];
  for (const c of checks) {
    if (c.regex.test(text)) {
      score += c.risk;
      findings.push(c.note);
    }
  }

  const grade = score <= 0 ? 'A' : score <= 1 ? 'B' : score <= 3 ? 'C' : score <= 5 ? 'D' : 'F';
  const confidence = Math.max(0.05, Math.min(0.99, 1 - score * 0.14));

  return { grade, confidence: Number(confidence.toFixed(2)), findings };
}

const INSTAGRAM_FINANCE_STYLES = [
  'editorial cartoon illustration with modern flat colors',
  'semi-realistic cartoon with expressive characters and cinematic lighting',
  '3D cartoon style with polished textures and playful proportions',
  'hand-drawn comic style with clean ink lines and soft color fills',
  'digital watercolor cartoon with warm tones and subtle grain',
] as const;

const INSTAGRAM_FINANCE_SCENES = [
  'young professional reviewing a retirement dashboard on a phone in a coffee shop',
  'family couple discussing a monthly budget at a kitchen table with bills and laptop',
  'small business owner analyzing cash-flow charts in a bright studio office',
  'advisor and client planning long-term goals at a desk with tablet and notes',
  'friends comparing savings goals during a walk in an urban park',
] as const;

function pickVariantSeed(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

function buildInstagramImagePrompt(caption: string) {
  const seed = pickVariantSeed(caption);
  const style = INSTAGRAM_FINANCE_STYLES[seed % INSTAGRAM_FINANCE_STYLES.length];
  const scene = INSTAGRAM_FINANCE_SCENES[(seed >> 3) % INSTAGRAM_FINANCE_SCENES.length];

  return [
    'Create an Instagram-ready square image (1:1) for a financial services post.',
    'Primary style: cartoon-forward, polished, and scroll-stopping.',
    `Art direction: ${style}.`,
    `Scene: ${scene}.`,
    'Blend cartoon storytelling with realistic human emotion, natural body language, and believable scenery.',
    'Keep tone positive, trustworthy, and educational (no fearmongering, no unrealistic promises).',
    'Do not include logos, watermarks, UI screenshots, or text overlays.',
    'Financial context should be visually clear with subtle props (phone dashboards, notes, charts, calculators).',
    `Caption intent to match: ${caption.slice(0, 900)}`,
  ].join(' ');
}

async function generateInstagramImage(apiKey: string, prompt: string): Promise<{ imageUrl: string | null; error?: string }> {
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1024x1024',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { imageUrl: null, error: data?.error?.message || `Image API error (${res.status})` };
    }
    const first = data?.data?.[0];
    if (first?.url) return { imageUrl: first.url as string };
    if (first?.b64_json) return { imageUrl: `data:image/png;base64,${first.b64_json}` as string };
    return { imageUrl: null, error: 'Image API returned no image payload' };
  } catch (err: any) {
    return { imageUrl: null, error: err?.message || 'Image generation request failed' };
  }
}

export async function POST(req: Request) {
  const body = await req.json();

  const { type, mode = 'single', selectedTypes, includeInstagramImage = false, sourceContentIds, customPrompt, tone, additionalContext } = body as {
    type: ContentType;
    mode?: 'single' | 'kit';
    selectedTypes?: ContentType[];
    includeInstagramImage?: boolean;
    sourceContentIds: string[];
    customPrompt?: string;
    tone: ToneType;
    additionalContext?: string;
  };

  if ((!type && mode !== 'kit') || !tone) {
    return new Response(JSON.stringify({ error: 'Missing required fields: type and tone' }), { status: 400 });
  }

  const env = getServerEnv();
  const supabase = getSupabaseServerClient();
  let sourceText = 'No source material provided. Create original content based on the user instructions.';

  if (sourceContentIds?.length) {
    const { data, error } = await supabase
      .from('source_content')
      .select('id,title,author,body')
      .in('id', sourceContentIds);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (data?.length) {
      sourceText = data.map((c) => `Title: ${c.title}\nAuthor: ${c.author || 'Unknown'}\n\n${c.body}`).join('\n\n---\n\n');
    }
  }

  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

  if (mode === 'kit') {
    const assets = (selectedTypes || []).map((assetType) => ({
      type: assetType,
      label: assetType === 'email-marketing' ? 'Email' :
        assetType === 'social-instagram' ? 'Instagram Caption' :
        assetType === 'social-linkedin' ? 'LinkedIn Post' :
        assetType === 'social-twitter' ? 'Twitter/X Post' :
        assetType === 'newsletter' ? 'Newsletter' :
        assetType === 'article' ? 'Article/Blog Post' :
        'Infographic Copy',
    }));

    if (!assets.length) {
      return new Response(JSON.stringify({ error: 'Select at least one content type' }), { status: 400 });
    }

    const parts: string[] = [];
    const images: Record<string, string> = {};
    const sectionScores: Array<{ label: string; grade: string; confidence: number; findings: string[] }> = [];
    for (const asset of assets) {
      const systemPrompt = buildSystemPrompt(asset.type, tone);
      const userPrompt = buildUserPrompt(asset.type, sourceText, customPrompt, additionalContext);
      const result = await generateText({
        model: openai(env.OPENAI_MODEL),
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: 1200,
        temperature: 0.7,
      });
      let sectionText = result.text.trim();
      if (includeInstagramImage && asset.type === 'social-instagram') {
        const imagePrompt = buildInstagramImagePrompt(sectionText);
        const image = await generateInstagramImage(env.OPENAI_API_KEY, imagePrompt);
        if (image.imageUrl) {
          images.instagram = image.imageUrl;
          sectionText += `\n\nImage generation status: success`;
        } else {
          sectionText += `\n\nImage generation status: failed (${image.error || 'unknown error'})`;
        }
      }
      parts.push(`## ${asset.label}\n\n${sectionText}`);
      sectionScores.push({ label: asset.label, ...assessCompliance(sectionText) });
    }

    const content = parts.join('\n\n---\n\n');
    const overall = assessCompliance(content);
    return new Response(JSON.stringify({ content, images, compliance: { ...overall, sectionScores } }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }

  const systemPrompt = buildSystemPrompt(type, tone);
  const userPrompt = buildUserPrompt(type, sourceText, customPrompt, additionalContext);
  const result = await generateText({
    model: openai(env.OPENAI_MODEL),
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 2000,
    temperature: 0.7,
  });

  let outputText = result.text;
  const images: Record<string, string> = {};
  if (includeInstagramImage && type === 'social-instagram') {
    const imagePrompt = buildInstagramImagePrompt(outputText);
    const image = await generateInstagramImage(env.OPENAI_API_KEY, imagePrompt);
    if (image.imageUrl) {
      images.instagram = image.imageUrl;
      outputText += `\n\nImage generation status: success`;
    } else {
      outputText += `\n\nImage generation status: failed (${image.error || 'unknown error'})`;
    }
  }

  const compliance = assessCompliance(outputText);
  return new Response(JSON.stringify({ content: outputText, images, compliance }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
