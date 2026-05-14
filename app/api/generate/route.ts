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

export async function POST(req: Request) {
  const body = await req.json();

  const { type, mode = 'single', kitAssets, sourceContentIds, customPrompt, tone, additionalContext } = body as {
    type: ContentType;
    mode?: 'single' | 'kit';
    kitAssets?: { linkedin?: boolean; instagram?: boolean; email?: boolean };
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
    const assets = [
      kitAssets?.linkedin ? ({ label: 'LinkedIn Post', type: 'social-linkedin' as ContentType }) : null,
      kitAssets?.instagram ? ({ label: 'Instagram Caption', type: 'social-instagram' as ContentType }) : null,
      kitAssets?.email ? ({ label: 'Email', type: 'email-marketing' as ContentType }) : null,
    ].filter(Boolean) as Array<{ label: string; type: ContentType }>;

    if (!assets.length) {
      return new Response(JSON.stringify({ error: 'Select at least one KIT asset' }), { status: 400 });
    }

    const parts: string[] = [];
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
      const sectionText = result.text.trim();
      parts.push(`## ${asset.label}\n\n${sectionText}`);
      sectionScores.push({ label: asset.label, ...assessCompliance(sectionText) });
    }

    const content = parts.join('\n\n---\n\n');
    const overall = assessCompliance(content);
    return new Response(JSON.stringify({ content, compliance: { ...overall, sectionScores } }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
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

  const compliance = assessCompliance(result.text);
  return new Response(JSON.stringify({ content: result.text, compliance }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
