import { streamText } from 'ai';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/ai/prompts';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getServerEnv } from '@/lib/env';
import type { ContentType, ToneType } from '@/lib/types/content';

export async function POST(req: Request) {
  const body = await req.json();

  const { type, sourceContentIds, customPrompt, tone, additionalContext } = body as {
    type: ContentType;
    sourceContentIds: string[];
    customPrompt?: string;
    tone: ToneType;
    additionalContext?: string;
  };

  if (!type || !tone) {
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

  const systemPrompt = buildSystemPrompt(type, tone);
  const userPrompt = buildUserPrompt(type, sourceText, customPrompt, additionalContext);

  const result = streamText({
    model: `openai/${env.OPENAI_MODEL}`,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 2000,
    temperature: 0.7,
    apiKey: env.OPENAI_API_KEY,
  });

  return result.toTextStreamResponse();
}
