import { NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { parseSearchPrompt } from '@/lib/audit/search-parser';
import { makeSnippet, normalizeSourceText, scoreTextMatch } from '@/lib/audit/text';

const OutSchema = z.object({
  summary: z.string(),
  matches: z.array(
    z.object({
      id: z.string(),
      reason: z.string(),
      evidence: z.string(),
      confidence: z.number(),
    })
  ),
});

function fallbackAnalyze(rows: any[], prompt: string) {
  const parsed = parseSearchPrompt(prompt);
  let includeTerms = parsed.mustInclude || [];
  const mode: 'all' | 'any' = (parsed.mode || 'all') as 'all' | 'any';

  if (!includeTerms.length) includeTerms = [prompt.trim()];

  const matches = rows
    .map((r) => {
      const scored = scoreTextMatch({
        text: `${r.title || ''}\n${r.body || ''}`,
        includeTerms,
        excludeTerms: parsed.mustExclude,
        mode,
      });
      return { ...r, ...scored };
    })
    .filter((r) => r.includeOk && r.excludeOk)
    .sort((a, b) => b.score - a.score)
    .map((r) => ({
      id: r.id,
      externalId: r.externalId || null,
      title: r.title || '',
      publisher: r.publisher || null,
      sourceSystem: r.sourceSystem || null,
      type: r.type || 'article',
      publishedAt: r.publishedAt || null,
      url: r.url || null,
      tags: r.tags || [],
      body: r.body || '',
      excerpt: makeSnippet(r.body || '', r.matchedTerms.length ? r.matchedTerms : includeTerms),
      snippet: makeSnippet(r.body || '', r.matchedTerms.length ? r.matchedTerms : includeTerms),
      matchedTerms: r.matchedTerms,
      excludedTerms: r.excludedTerms,
      reason: 'Matched deterministic fallback constraints',
      evidence: makeSnippet(r.body || '', r.matchedTerms.length ? r.matchedTerms : includeTerms, 180),
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

    const parsed = parseSearchPrompt(prompt);
    const includeTerms = parsed.mustInclude.length ? parsed.mustInclude : [prompt.trim()];
    const excludeTerms = parsed.mustExclude;
    const scanLimit = depth === 'deep' ? 1000 : Math.min(500, Math.max(1, Number(limit) || 300));
    const candidateLimit = depth === 'deep' ? 120 : 60;
    const chunkSize = depth === 'deep' ? 15 : 20;

    const supabase = getSupabaseServerClient();
    let q = supabase
      .from('source_content')
      .select('id,external_id,title,body,publisher,source_system,type,metadata,tags,published_at')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(scanLimit);
    if (publisher !== 'all') q = q.eq('publisher', publisher);
    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const rows = (data || []).map((r: any) => ({
      id: r.id,
      externalId: r.external_id || null,
      title: r.title,
      publisher: r.publisher,
      sourceSystem: r.source_system || null,
      type: r.type || 'article',
      url: r.metadata?.url || null,
      tags: Array.isArray(r.tags) ? r.tags : [],
      excerpt: '',
      publishedAt: r.published_at,
      body: normalizeSourceText(String(r.body || '')).slice(0, 3000),
    }));

    const scoredRows = rows
      .map((row) => {
        const scored = scoreTextMatch({
          text: `${row.title || ''}\n${row.body || ''}`,
          includeTerms,
          excludeTerms,
          mode: parsed.mode,
        });
        return { ...row, ...scored };
      })
      .filter((row) => row.excludeOk)
      .sort((a, b) => b.score - a.score);

    const literalCandidates = scoredRows.filter((row) => row.includeOk);
    const aiRows = (literalCandidates.length ? literalCandidates : scoredRows)
      .slice(0, candidateLimit)
      .map((row) => ({
        id: row.id,
        title: row.title,
        publisher: row.publisher,
        type: row.type,
        publishedAt: row.publishedAt,
        matchedTerms: row.matchedTerms,
        text: row.body.slice(0, 1800),
      }));

    let parserUsed: 'ai' | 'fallback' = 'ai';
    const idSet = new Set(aiRows.map((r) => r.id));
    const rowById = new Map(scoredRows.map((r) => [r.id, r]));

    try {
      const env = getServerEnv();
      const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
      const chunks = chunk(aiRows, chunkSize);
      const merged: any[] = [];
      const summaries: string[] = [];

      for (const c of chunks) {
        const result = await generateObject({
          model: openai(env.OPENAI_MODEL),
          schema: OutSchema,
          prompt: [
            `Task: ${prompt}`,
            '',
            'Classify source content against these constraints:',
            `- Must include: ${includeTerms.join(', ') || 'n/a'}`,
            `- Must exclude: ${excludeTerms.join(', ') || 'n/a'}`,
            `- Include mode: ${parsed.mode}`,
            '',
            'Return only rows that satisfy the task. If a row includes an excluded term or fails the include requirement, do not return it.',
            'Use exact evidence from the row text. Confidence should reflect how directly the row satisfies the constraints.',
            'Only use ids from rows.',
            '',
            `Rows:\n${JSON.stringify(c)}`,
          ].join('\n'),
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

      const matches = Array.from(dedup.values())
        .map((m: any) => {
          const row = rowById.get(m.id);
          return {
            id: m.id,
            externalId: row?.externalId || null,
            title: row?.title || '',
            publisher: row?.publisher || null,
            sourceSystem: row?.sourceSystem || null,
            type: row?.type || 'article',
            publishedAt: row?.publishedAt || null,
            url: row?.url || null,
            tags: row?.tags || [],
            body: row?.body || '',
            excerpt: makeSnippet(row?.body || '', row?.matchedTerms?.length ? row.matchedTerms : includeTerms),
            snippet: m.evidence || makeSnippet(row?.body || '', row?.matchedTerms?.length ? row.matchedTerms : includeTerms),
            matchedTerms: row?.matchedTerms || [],
            excludedTerms: row?.excludedTerms || [],
            reason: m.reason,
            evidence: m.evidence,
            confidence: m.confidence,
          };
        })
        .sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0));

      if (!matches.length) {
        parserUsed = 'fallback';
        const fb = fallbackAnalyze(scoredRows, prompt);
        return NextResponse.json({ ok: true, mode: 'ai-analyze', parserUsed, fallbackReason: 'ai-returned-zero-matches', structured: { mustInclude: includeTerms, mustExclude: excludeTerms, mode: parsed.mode, publisher: publisher !== 'all' ? publisher : undefined }, scanned: rows.length, candidateCount: aiRows.length, chunkCount: chunks.length, summary: fb.summary, total: fb.matches.length, matches: fb.matches });
      }

      return NextResponse.json({ ok: true, mode: 'ai-analyze', parserUsed, structured: { mustInclude: includeTerms, mustExclude: excludeTerms, mode: parsed.mode, publisher: publisher !== 'all' ? publisher : undefined }, scanned: rows.length, candidateCount: aiRows.length, chunkCount: chunks.length, summary: summaries.filter(Boolean).join(' | ').slice(0, 1000), total: matches.length, matches });
    } catch (err: any) {
      parserUsed = 'fallback';
      const fb = fallbackAnalyze(scoredRows, prompt);
      return NextResponse.json({ ok: true, mode: 'ai-analyze', parserUsed, fallbackReason: err?.message ? `ai-error:${String(err.message).slice(0, 120)}` : 'ai-error', structured: { mustInclude: includeTerms, mustExclude: excludeTerms, mode: parsed.mode, publisher: publisher !== 'all' ? publisher : undefined }, scanned: rows.length, candidateCount: aiRows.length, chunkCount: 1, summary: fb.summary, total: fb.matches.length, matches: fb.matches });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Analyze failed' }, { status: 500 });
  }
}
