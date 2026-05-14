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
        evidence: z.string().default(''),
        confidence: z.number().min(0).max(1),
      })
    )
    .default([]),
});

function fallbackAnalyze(rows: any[], prompt: string) {
  const parsed = parseSearchPrompt(prompt);

  const stopwords = new Set(['the','and','for','with','that','this','from','into','about','what','when','where','which','would','could','should','have','has','had','are','was','were','your','their','them','they','then','than','also','just','like','find','show','list','content']);

  let includeTerms = parsed.mustInclude || [];
  let mode: 'all' | 'any' = (parsed.mode || 'all') as 'all' | 'any';

  // Natural-language prompts often parse into one long include phrase that never literal-matches.
  // Tokenize to resilient keyword matching in fallback mode.
  if (includeTerms.length <= 1) {
    const tokens = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 4 && !stopwords.has(t));
    const uniq = Array.from(new Set(tokens)).slice(0, 8);
    if (uniq.length >= 2) {
      includeTerms = uniq;
      mode = 'any';
    }
  }

  const matches = rows
    .filter((r) => {
      const hay = `${r.title || ''}\n${r.body || ''}`.toLowerCase();
      const includeOk = mode === 'any'
        ? includeTerms.some((t) => hay.includes(t.toLowerCase()))
        : includeTerms.every((t) => hay.includes(t.toLowerCase()));
      const excludeOk = parsed.mustExclude.every((t) => !hay.includes(t.toLowerCase()));
      return includeOk && excludeOk;
    })
    .map((r) => ({
      id: r.id,
      reason: 'Matched fallback keyword logic',
      evidence: (r.body || '').slice(0, 180),
      confidence: 0.55,
    }));

  return {
    summary: `Fallback analysis returned ${matches.length} matches (mode=${mode}, includeTerms=${includeTerms.length}).`,
    matches,
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: Request) {
  try {
    const { prompt, publisher = 'all', limit = 120, depth = 'quick' } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ ok: false, error: 'Missing prompt' }, { status: 400 });

    const scanLimit = depth === 'deep' ? 300 : Math.min(150, Math.max(1, Number(limit) || 120));
    const chunkSize = depth === 'deep' ? 20 : 25;

    const supabase = getSupabaseServerClient();
    let q = supabase
      .from('source_content')
      .select('id,title,body,publisher,published_at')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(scanLimit);
    if (publisher !== 'all') q = q.eq('publisher', publisher);
    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const rows = (data || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      publisher: r.publisher,
      publishedAt: r.published_at,
      body: String(r.body || '').slice(0, 2000),
    }));

    let parserUsed: 'ai' | 'fallback' = 'ai';
    const idSet = new Set(rows.map((r) => r.id));

    try {
      const env = getServerEnv();
      const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
      const chunks = chunk(rows, chunkSize);
      const merged: any[] = [];
      const summaries: string[] = [];

      for (const c of chunks) {
        const result = await generateObject({
          model: openai(env.OPENAI_MODEL),
          schema: OutSchema,
          prompt: `Task: ${prompt}\nAnalyze these rows and return likely matches with reasons, evidence, confidence.\nOnly use ids from rows.\nRows:\n${JSON.stringify(c)}`,
        });
        summaries.push(result.object.summary);
        merged.push(...(result.object.matches || []));
      }

      const dedup = new Map<string, any>();
      for (const m of merged) {
        if (!idSet.has(m.id)) continue;
        const prev = dedup.get(m.id);
        if (!prev || (m.confidence || 0) > (prev.confidence || 0)) dedup.set(m.id, m);
      }

      const matches = Array.from(dedup.values()).sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

      if (!matches.length) {
        parserUsed = 'fallback';
        const fb = fallbackAnalyze(rows, prompt);
        return NextResponse.json({ ok: true, mode: 'ai-analyze', parserUsed, fallbackReason: 'ai-returned-zero-matches', scanned: rows.length, chunkCount: chunks.length, summary: fb.summary, total: fb.matches.length, matches: fb.matches });
      }

      return NextResponse.json({ ok: true, mode: 'ai-analyze', parserUsed, scanned: rows.length, chunkCount: chunks.length, summary: summaries.filter(Boolean).join(' | ').slice(0, 1000), total: matches.length, matches });
    } catch (err: any) {
      parserUsed = 'fallback';
      const fb = fallbackAnalyze(rows, prompt);
      return NextResponse.json({ ok: true, mode: 'ai-analyze', parserUsed, fallbackReason: err?.message ? `ai-error:${String(err.message).slice(0, 120)}` : 'ai-error', scanned: rows.length, chunkCount: 1, summary: fb.summary, total: fb.matches.length, matches: fb.matches });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Analyze failed' }, { status: 500 });
  }
}
