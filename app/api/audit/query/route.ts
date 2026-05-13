import { NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const QuerySchema = z.object({
  mustInclude: z.array(z.string()).default([]),
  mustExclude: z.array(z.string()).default([]),
  publisher: z.string().optional(),
  limit: z.number().int().min(1).max(500).default(100),
});

function makeSnippet(text: string, terms: string[]) {
  if (!text) return '';
  const lower = text.toLowerCase();
  const hit = terms.find((t) => t && lower.includes(t.toLowerCase()));
  if (!hit) return text.slice(0, 220);
  const idx = lower.indexOf(hit.toLowerCase());
  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + hit.length + 120);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

export async function POST(req: Request) {
  const { prompt, publisher, limit } = (await req.json()) as {
    prompt: string;
    publisher?: string;
    limit?: number;
  };

  if (!prompt?.trim()) {
    return NextResponse.json({ ok: false, error: 'Missing prompt' }, { status: 400 });
  }

  const env = getServerEnv();
  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

  const parse = await generateObject({
    model: openai(env.OPENAI_MODEL),
    schema: QuerySchema,
    prompt: `Convert this audit request into literal search phrases. Request: ${prompt}\nReturn short exact phrases only.`,
  });

  const structured = parse.object;
  if (publisher && publisher !== 'all') structured.publisher = publisher;
  if (limit) structured.limit = Math.min(500, Math.max(1, limit));

  const supabase = getSupabaseServerClient();
  let q = supabase.from('source_content').select('id,title,body,publisher,source_system,published_at').order('published_at', { ascending: false, nullsFirst: false });
  if (structured.publisher && structured.publisher !== 'all') q = q.eq('publisher', structured.publisher);

  const { data, error } = await q.limit(structured.limit || 100);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const mustInclude = structured.mustInclude || [];
  const mustExclude = structured.mustExclude || [];

  const rows = (data || []).filter((row: any) => {
    const hay = `${row.title || ''}\n${row.body || ''}`.toLowerCase();
    const includeOk = mustInclude.every((t) => hay.includes(t.toLowerCase()));
    const excludeOk = mustExclude.every((t) => !hay.includes(t.toLowerCase()));
    return includeOk && excludeOk;
  });

  const matches = rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    publisher: row.publisher || null,
    sourceSystem: row.source_system || null,
    publishedAt: row.published_at || null,
    snippet: makeSnippet(row.body || '', mustInclude),
    score: mustInclude.length,
  }));

  return NextResponse.json({ ok: true, structured, total: matches.length, matches });
}
