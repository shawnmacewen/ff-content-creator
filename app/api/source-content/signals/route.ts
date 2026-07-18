import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { buildRuleBasedSignals, mergeContentSignals, normalizeContentSignals } from '@/lib/source-content/signals';
import { getCanonicalBody } from '@/lib/source-content/body';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const SignalSchema = z.object({
  signals: z.array(z.object({
    type: z.enum(['topic', 'timeliness', 'content_opportunity', 'generation_guidance']),
    label: z.string().min(3).max(64),
    reason: z.string().min(12).max(180),
    evidence: z.string().min(6).max(220),
    confidence: z.number().min(0.05).max(0.99),
  })).max(8),
});

function safeArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function metadataSummary(row: any) {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return String(metadata.summary || metadata.description || metadata.excerpt || '').trim();
}

function countWords(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => /\w/.test(word)).length;
}

function normalizeAiSignals(value: z.infer<typeof SignalSchema>['signals']) {
  return normalizeContentSignals(value.map((signal) => ({
    ...signal,
    source: 'ai_classification',
  })));
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(50, Math.max(1, Number(body?.batchSize ?? body?.limit) || 20));
    const ids = safeArray(body?.ids).map((id) => String(id)).filter(Boolean).slice(0, 50);
    const overwrite = Boolean(body?.overwrite);
    const cursor = typeof body?.cursor === 'string' && body.cursor.trim() ? body.cursor.trim() : null;

    const env = getServerEnv();
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('source_content')
      .select('id,title,body_text,body,metadata,tags,categories,sub_categories,key_takeaways,recommended_audience,content_designation,type,publisher,published_at,bas_content_filename,external_id,finra_approved,finra_letter_url,evergreen')
      .order('id', { ascending: true })
      .limit(batchSize);

    if (ids.length) query = query.in('id', ids);
    else if (cursor) query = query.gt('id', cursor);

    const { data, error } = await query;
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

    const rows = data || [];
    const results: Array<{ id: string; title: string; status: string; signals?: number; reason?: string }> = [];

    for (const row of rows) {
      const title = String(row.title || 'Untitled source');
      const metadata = row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? row.metadata : {};
      const existingSignals = normalizeContentSignals(metadata.contentSignals);
      if (!overwrite && existingSignals.length) {
        results.push({ id: row.id, title, status: 'skipped', signals: existingSignals.length, reason: 'Existing metadata signals preserved.' });
        continue;
      }

      const bodyText = getCanonicalBody(row);
      const bodyWordCount = countWords(bodyText);
      const ruleSignals = buildRuleBasedSignals(row);

      if (bodyWordCount < 80) {
        const update = await supabase
          .from('source_content')
          .update({ metadata: { ...metadata, contentSignals: ruleSignals, contentSignalsGeneratedAt: new Date().toISOString() } })
          .eq('id', row.id);

        if (update.error) results.push({ id: row.id, title, status: 'failed', reason: update.error.message });
        else results.push({ id: row.id, title, status: 'updated', signals: ruleSignals.length, reason: `Rule-only signals; body has ${bodyWordCount} words.` });
        continue;
      }

      const prompt = [
        'You create explainable content signals for a financial services content library.',
        'Signals are assists, not facts about client preferences. Do not create a planning-angle signal.',
        '',
        'Return only signals that can be justified by the source metadata or body evidence.',
        'Every signal must include a user-facing reason and a short evidence quote or metadata cue.',
        '',
        'Allowed signal types:',
        '- topic: what the article is about, based on tags/title/body.',
        '- timeliness: only use Time-sensitive, Seasonal, Evergreen, or Needs date context when evidence supports it.',
        '- content_opportunity: useful content use cases such as Good for carousel, Good for email, Good for newsletter, Advisor talking points, FAQ candidate, or Needs source review.',
        '- generation_guidance: practical prompt guidance such as Mention date context, Use plain language, Keep claims conservative, Include CTA, Human review recommended.',
        '',
        'Content opportunity rules:',
        '- Be conservative. Choose opportunities from evidence, not guesswork.',
        '- Prefer useful generation actions over vague marketing language.',
        '- If the source is weak, mark Needs source review instead of forcing an opportunity.',
        '',
        'Timeliness rules:',
        '- Published date alone is not a signal; the app already sorts newest first.',
        '- Seasonal/time-sensitive signals require article evidence such as deadlines, enrollment windows, tax season, a specific year/quarter, new rules, election, rate decision, or similar timing cues.',
        '',
        'Generation guidance rules:',
        '- Derive guidance from the source topic/timeliness/source quality.',
        '- Do not make compliance approval claims.',
        '',
        'SOURCE METADATA:',
        `Title: ${title}`,
        `Designation: ${row.content_designation || row.type || 'n/a'}`,
        `Publisher: ${row.publisher || 'n/a'}`,
        `Published: ${row.published_at || 'n/a'}`,
        `Tags: ${safeArray(row.tags).join(', ') || 'none'}`,
        `Categories: ${[...safeArray(row.categories), ...safeArray(row.sub_categories)].join(', ') || 'none'}`,
        `Key takeaways: ${safeArray(row.key_takeaways).join(' | ') || 'none'}`,
        `Recommended audience: ${row.recommended_audience || 'none'}`,
        `Summary: ${metadataSummary(row) || 'none'}`,
        `Body word count: ${bodyWordCount}`,
        '',
        'SOURCE BODY:',
        bodyText.slice(0, 14000),
      ].join('\n');

      const generated = await generateObject({
        model: openai(env.OPENAI_MODEL),
        schema: SignalSchema,
        temperature: 0.2,
        prompt,
      });

      const signals = mergeContentSignals(ruleSignals, normalizeAiSignals(generated.object.signals));
      const update = await supabase
        .from('source_content')
        .update({ metadata: { ...metadata, contentSignals: signals, contentSignalsGeneratedAt: new Date().toISOString() } })
        .eq('id', row.id);

      if (update.error) {
        results.push({ id: row.id, title, status: 'failed', reason: update.error.message });
        continue;
      }

      results.push({ id: row.id, title, status: 'updated', signals: signals.length });
    }

    return Response.json({
      ok: true,
      scanned: rows.length,
      batchSize,
      cursor,
      nextCursor: rows.length ? String(rows[rows.length - 1].id) : cursor,
      hasMore: rows.length === batchSize && !ids.length,
      updated: results.filter((item) => item.status === 'updated').length,
      skipped: results.filter((item) => item.status === 'skipped').length,
      failed: results.filter((item) => item.status === 'failed').length,
      results,
    });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || 'Failed to generate content signals.' }, { status: 500 });
  }
}
