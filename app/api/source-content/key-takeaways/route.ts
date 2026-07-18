import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getCanonicalBody } from '@/lib/source-content/body';
import { countBodyWords, takeawayMetadata } from '@/lib/source-content/takeaways';

const TakeawaySchema = z.object({
  keyTakeaways: z.array(z.string().min(12).max(140)).min(2).max(3),
  recommendedAudience: z.string().min(8).max(120),
});

function safeArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function cleanTakeaways(items: string[], maxItems: number) {
  return items
    .map((item) => String(item || '').replace(/\s+/g, ' ').replace(/^[•\-–—]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanAudience(value: string) {
  return String(value || '').replace(/\s+/g, ' ').replace(/^[•\-–—]\s*/, '').trim().slice(0, 120);
}

function metadataSummary(row: any) {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return String(metadata.summary || metadata.description || metadata.excerpt || '').trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(100, Math.max(1, Number(body?.batchSize ?? body?.limit) || 25));
    const ids = safeArray(body?.ids).map((id) => String(id)).filter(Boolean).slice(0, 100);
    const overwrite = Boolean(body?.overwrite);
    const cursor = typeof body?.cursor === 'string' && body.cursor.trim() ? body.cursor.trim() : null;

    const env = getServerEnv();
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('source_content')
      .select('id,title,body_text,body,metadata,tags,key_takeaways,recommended_audience,content_designation,type,publisher,published_at')
      .order('id', { ascending: true })
      .limit(batchSize);

    if (ids.length) query = query.in('id', ids);
    else if (cursor) query = query.gt('id', cursor);
    if (!overwrite) query = query.or('key_takeaways.is.null,key_takeaways.eq.{},recommended_audience.is.null,recommended_audience.eq.');

    const { data, error } = await query;
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

    const rows = data || [];
    const results: Array<{ id: string; title: string; status: string; keyTakeaways?: string[]; recommendedAudience?: string; reason?: string }> = [];

    for (const row of rows) {
      const title = String(row.title || 'Untitled source');
      const metadata = row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? row.metadata : {};
      const bodyText = getCanonicalBody(row);
      const bodyWordCount = countBodyWords(bodyText);

      if (bodyWordCount < 100) {
        const reason = `Body has fewer than 100 words (${bodyWordCount})`;
        await supabase
          .from('source_content')
          .update({ metadata: { ...metadata, takeawaysEnrichment: takeawayMetadata('skipped_short_body', reason, bodyWordCount) } })
          .eq('id', row.id);
        results.push({ id: row.id, title, status: 'skipped', reason });
        if (overwrite && ((Array.isArray(row.key_takeaways) && row.key_takeaways.length) || row.recommended_audience)) {
          await supabase.from('source_content').update({ key_takeaways: [], recommended_audience: null }).eq('id', row.id);
        }
        continue;
      }

      const takeawayCount = bodyWordCount < 350 ? 2 : 3;
      const prompt = [
        'You write concise editorial metadata for financial education source content.',
        `Create exactly ${takeawayCount} key takeaways from the article and one recommended audience phrase.`,
        '',
        'Key takeaway rules:',
        '- Each takeaway must come from the article itself, not generic marketing value.',
        '- Summarize what the article teaches, explains, compares, warns about, or helps the reader understand.',
        '- Point takeaways at a reader interested in the article and at someone deciding whether to use/share it.',
        '- Do not write generic lines such as "use this source" or "review the article".',
        '- Keep each takeaway under 18 words.',
        '',
        'Recommended audience rules:',
        '- Write one short phrase describing who this article is suitable for.',
        '- Use the lens of financial advisory teams, enterprise marketing support users, investors, clients, or prospects.',
        '- Include demographic/life-stage fit when the article implies one, such as parents/grandparents for 529/college content.',
        '- Keep the phrase under 12 words.',
        '',
        'General rules:',
        '- Do not invent facts, data, advice, products, or regulatory claims.',
        '- Do not number the takeaways.',
        '',
        'SOURCE METADATA:',
        `Title: ${title}`,
        `Designation: ${row.content_designation || row.type || 'n/a'}`,
        `Publisher: ${row.publisher || 'n/a'}`,
        `Published: ${row.published_at || 'n/a'}`,
        `Tags: ${safeArray(row.tags).join(', ') || 'none'}`,
        `Summary: ${metadataSummary(row) || 'none'}`,
        `Body word count: ${bodyWordCount}`,
        '',
        'SOURCE BODY:',
        bodyText.slice(0, 12000),
      ].join('\n');

      const generated = await generateObject({
        model: openai(env.OPENAI_MODEL),
        schema: TakeawaySchema,
        temperature: 0.25,
        prompt,
      });

      const keyTakeaways = cleanTakeaways(generated.object.keyTakeaways, takeawayCount);
      const recommendedAudience = cleanAudience(generated.object.recommendedAudience);
      if (keyTakeaways.length !== takeawayCount) {
        const reason = `AI returned ${keyTakeaways.length} takeaways; expected ${takeawayCount}`;
        await supabase
          .from('source_content')
          .update({ metadata: { ...metadata, takeawaysEnrichment: takeawayMetadata('failed', reason, bodyWordCount) } })
          .eq('id', row.id);
        results.push({ id: row.id, title, status: 'failed', reason });
        continue;
      }

      const update = await supabase
        .from('source_content')
        .update({
          key_takeaways: keyTakeaways,
          recommended_audience: recommendedAudience || null,
          metadata: {
            ...metadata,
            takeawaysEnrichment: takeawayMetadata('ready', 'Stored key takeaways and recommended audience are available.', bodyWordCount),
          },
        })
        .eq('id', row.id);

      if (update.error) {
        await supabase
          .from('source_content')
          .update({ metadata: { ...metadata, takeawaysEnrichment: takeawayMetadata('failed', update.error.message, bodyWordCount) } })
          .eq('id', row.id);
        results.push({ id: row.id, title, status: 'failed', reason: update.error.message });
        continue;
      }

      results.push({ id: row.id, title, status: 'updated', keyTakeaways, recommendedAudience });
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
    return Response.json({ ok: false, error: error?.message || 'Failed to generate key takeaways.' }, { status: 500 });
  }
}
