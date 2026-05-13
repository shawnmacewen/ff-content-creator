import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { parseSearchPrompt } from '@/lib/audit/search-parser';

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
  try {
    const { prompt, publisher, limit, mode } = (await req.json()) as {
      prompt: string;
      publisher?: string;
      limit?: number;
      mode?: 'all' | 'any';
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ ok: false, error: 'Missing prompt', stage: 'input' }, { status: 400 });
    }

    const parsed = parseSearchPrompt(prompt);
    const structured = {
      mustInclude: parsed.mustInclude.length ? parsed.mustInclude : [prompt.trim()],
      mustExclude: parsed.mustExclude,
      mode: mode || parsed.mode || 'all',
      publisher: publisher && publisher !== 'all' ? publisher : undefined,
      limit: Math.min(500, Math.max(1, Number(limit) || 100)),
    };

    const supabase = getSupabaseServerClient();
    let q = supabase
      .from('source_content')
      .select('id,title,body,publisher,source_system,published_at')
      .order('published_at', { ascending: false, nullsFirst: false });

    if (structured.publisher) q = q.eq('publisher', structured.publisher);

    const { data, error } = await q.limit(structured.limit);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message, stage: 'query' }, { status: 500 });
    }

    const mustInclude = structured.mustInclude || [];
    const mustExclude = structured.mustExclude || [];

    const rows = (data || []).filter((row: any) => {
      const hay = `${row.title || ''}\n${row.body || ''}`.toLowerCase();
      const includeOk = structured.mode === 'any'
        ? mustInclude.some((t) => hay.includes(t.toLowerCase()))
        : mustInclude.every((t) => hay.includes(t.toLowerCase()));
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

    return NextResponse.json({ ok: true, parserUsed: 'deterministic', structured, total: matches.length, scanned: (data || []).length, matches });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected search failure', stage: 'unknown' }, { status: 500 });
  }
}
