import { NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { parseSearchPrompt } from '@/lib/audit/search-parser';

const OutSchema = z.object({
  summary: z.string(),
  matches: z
    .array(
      z.object({
        id: z.string(),
        reason: z.string(),
        confidence: z.number().min(0).max(1),
      })
    )
    .default([]),
});

function fallbackAnalyze(rows: any[], prompt: string) {
  const parsed = parseSearchPrompt(prompt);
  const matches = rows
    .filter((r) => {
      const hay = `${r.title || ''}\n${r.body || ''}`.toLowerCase();
      const includeOk = (parsed.mode || 'all') === 'any'
        ? parsed.mustInclude.some((t) => hay.includes(t.toLowerCase()))
        : parsed.mustInclude.every((t) => hay.includes(t.toLowerCase()));
      const excludeOk = parsed.mustExclude.every((t) => !hay.includes(t.toLowerCase()));
      return includeOk && excludeOk;
    })
    .map((r) => ({
      id: r.id,
      reason: 'Matched fallback keyword logic',
      confidence: 0.55,
    }));

  return {
    summary: `Fallback analysis returned ${matches.length} matches.`,
    matches,
  };
}

export async function POST(req: Request) {
  try {
    const { prompt, publisher = 'all', limit = 120 } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ ok: false, error: 'Missing prompt' }, { status: 400 });

    const supabase = getSupabaseServerClient();
    let q = supabase
      .from('source_content')
      .select('id,title,body,publisher,published_at')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(Math.min(300, Math.max(1, Number(limit) || 120)));
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

    let parserUsed: 'ai' | 'fallback' = 'ai';
    let analyzed: any;

    try {
      const env = getServerEnv();
      const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
      const result = await generateObject({
        model: openai(env.OPENAI_MODEL),
        schema: OutSchema,
        prompt: `Task: ${prompt}\nAnalyze these rows and return likely matches with reasons and confidence.\nRules: only return ids that exist in rows.\nRows:\n${JSON.stringify(rows)}`,
      });
      analyzed = result.object;

      if (!analyzed?.matches?.length) {
        parserUsed = 'fallback';
        analyzed = fallbackAnalyze(rows, prompt);
      }
    } catch {
      parserUsed = 'fallback';
      analyzed = fallbackAnalyze(rows, prompt);
    }

    const idSet = new Set(rows.map((r) => r.id));
    const safeMatches = (analyzed.matches || []).filter((m: any) => idSet.has(m.id));

    return NextResponse.json({
      ok: true,
      mode: 'ai-analyze',
      parserUsed,
      scanned: rows.length,
      summary: analyzed.summary,
      total: safeMatches.length,
      matches: safeMatches,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Analyze failed' }, { status: 500 });
  }
}
