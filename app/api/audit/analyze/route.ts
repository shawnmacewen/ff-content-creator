import { NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const OutSchema = z.object({
  summary: z.string(),
  matches: z.array(z.object({
    id: z.string(),
    reason: z.string(),
    confidence: z.number().min(0).max(1),
  })).default([]),
});

export async function POST(req: Request) {
  try {
    const { prompt, publisher = 'all', limit = 120 } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ ok: false, error: 'Missing prompt' }, { status: 400 });

    const supabase = getSupabaseServerClient();
    let q = supabase.from('source_content').select('id,title,body,publisher,published_at').order('published_at', { ascending: false, nullsFirst: false }).limit(Math.min(300, Math.max(1, Number(limit) || 120)));
    if (publisher !== 'all') q = q.eq('publisher', publisher);
    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const rows = (data || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      publisher: r.publisher,
      publishedAt: r.published_at,
      body: String(r.body || '').slice(0, 2500),
    }));

    const env = getServerEnv();
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const result = await generateObject({
      model: openai(env.OPENAI_MODEL),
      schema: OutSchema,
      prompt: `Task: ${prompt}\nAnalyze these rows and return likely matches with reasons and confidence.\nRows:\n${JSON.stringify(rows)}`,
    });

    return NextResponse.json({ ok: true, mode: 'ai-analyze', scanned: rows.length, ...result.object });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Analyze failed' }, { status: 500 });
  }
}
