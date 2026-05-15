import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getServerEnv } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type EchoWriteBody = {
  prompt: string;
  writingStyle: 'professional' | 'fun' | 'educational';
  contentType: 'article' | 'video-script';
  length: 'short' | 'medium' | 'long';
  targetWordCount?: number;
};

function styleInstruction(style: EchoWriteBody['writingStyle']) {
  if (style === 'fun') return 'Use engaging, lively pacing, conversational vocabulary, and a friendly CTA.';
  if (style === 'educational') return 'Use teacher-like clarity, structured explanations, and actionable educational CTA.';
  return 'Use polished professional tone, concise business language, and confident CTA.';
}

function lengthInstruction(length: EchoWriteBody['length'], targetWordCount?: number) {
  if (targetWordCount && targetWordCount > 0) return `Target about ${targetWordCount} words.`;
  if (length === 'short') return 'Target 350-500 words.';
  if (length === 'long') return 'Target 1100-1500 words.';
  return 'Target 700-950 words.';
}

function scoreRow(row: any, query: string, tokens: string[]) {
  const title = String(row.title || '').toLowerCase();
  const body = String(row.body || '').toLowerCase();
  const q = query.toLowerCase();
  let score = 0;
  if (title.includes(q)) score += 20;
  if (body.includes(q)) score += 8;
  let matched = 0;
  for (const t of tokens) {
    if (title.includes(t)) { score += 6; matched += 1; }
    else if (body.includes(t)) { score += 3; matched += 1; }
  }
  return { score, matched };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EchoWriteBody;
    if (!body?.prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: rows, error } = await supabase
      .from('source_content')
      .select('id,title,body,publisher,content_designation,tags,published_at')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(1000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const tokens = Array.from(new Set(body.prompt.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 2)));

    const ranked = (rows || [])
      .map((row) => ({ row, ...scoreRow(row, body.prompt, tokens) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    const context = ranked
      .map((x, idx) => `Source ${idx + 1} | ${x.row.title}\nPublisher: ${x.row.publisher || 'n/a'}\nDesignation: ${x.row.content_designation || 'n/a'}\nTags: ${(x.row.tags || []).join(', ')}\n\n${String(x.row.body || '').slice(0, 1800)}`)
      .join('\n\n---\n\n');

    const env = getServerEnv();
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

    const contentTypeInstruction = body.contentType === 'video-script'
      ? 'Write as a production-ready video script with: hook opening, scene/segment structure, speaking cadence notes, optional visual direction callouts, and CTA ending.'
      : 'Write as an editorial article with: strong headline, subheadings, skimmable structure, intro and conclusion, and SEO-friendly formatting plus metadata suggestions.';

    const prompt = [
      `User intent: ${body.prompt}`,
      contentTypeInstruction,
      styleInstruction(body.writingStyle),
      lengthInstruction(body.length, body.targetWordCount),
      'Ground all claims in provided source context. Synthesize; do not copy verbatim. Avoid hallucinations.',
      'Return publication-ready output only.',
      '',
      'SOURCE CONTEXT:',
      context || 'No source context found. Be explicit about uncertainty and stay generic.',
    ].join('\n');

    const result = await generateText({
      model: openai(env.OPENAI_MODEL),
      prompt,
      temperature: 0.5,
      maxOutputTokens: 2200,
    });

    return NextResponse.json({
      content: result.text,
      sources: ranked.map((x) => ({
        id: x.row.id,
        title: x.row.title,
        publisher: x.row.publisher,
        designation: x.row.content_designation,
        score: x.score,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'EchoWrite failed' }, { status: 500 });
  }
}
