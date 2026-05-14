import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/ai/prompts';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getServerEnv } from '@/lib/env';
import type { ContentType, ToneType } from '@/lib/types/content';

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
      parts.push(`## ${asset.label}\n\n${result.text.trim()}`);
    }

    return new Response(parts.join('\n\n---\n\n'), { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
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

  return new Response(result.text, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
