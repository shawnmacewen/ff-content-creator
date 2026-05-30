import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getCanonicalBody } from '@/lib/source-content/body';

const TakeawaySchema = z.object({
  keyTakeaways: z.array(z.string().min(12).max(140)).length(3),
  recommendedAudience: z.string().min(8).max(120),
});

function safeArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function cleanTakeaways(items: string[]) {
  return items
    .map((item) => String(item || '').replace(/\s+/g, ' ').replace(/^[•\-–—]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

function cleanAudience(value: string) {
  return String(value || '').replace(/\s+/g, ' ').replace(/^[•\-–—]\s*/, '').trim().slice(0, 120);
}

function metadataSummary(row: any) {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return String(metadata.summary || metadata.description || metadata.excerpt || '').trim();
}

function hasReadableBody(row: any) {
  return getCanonicalBody(row).replace(/\s+/g, ' ').trim().length >= 180;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(100, Math.max(1, Number(body?.limit) || 25));
    const ids = safeArray(body?.ids).map((id) => String(id)).filter(Boolean).slice(0, 100);
    const overwrite = Boolean(body?.overwrite);

    const env = getServerEnv();
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('source_content')
      .select('id,title,body_text,body,metadata,tags,key_takeaways,recommended_audience,content_designation,type,publisher,published_at')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (ids.length) query = query.in('id', ids);
    if (!overwrite) query = query.or('key_takeaways.is.null,key_takeaways.eq.{},recommended_audience.is.null,recommended_audience.eq.');

    const { data, error } = await query;
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

    const rows = data || [];
    const results: Array<{ id: string; title: string; status: string; keyTakeaways?: string[]; recommendedAudience?: string; reason?: string }> = [];

    for (const row of rows) {
      const title = String(row.title || 'Untitled source');
      const bodyText = getCanonicalBody(row);

      if (!hasReadableBody(row)) {
        results.push({ id: row.id, title, status: 'skipped', reason: 'No readable body text' });
        if (overwrite && ((Array.isArray(row.key_takeaways) && row.key_takeaways.length) || row.recommended_audience)) {
          await supabase.from('source_content').update({ key_takeaways: [], recommended_audience: null }).eq('id', row.id);
        }
        continue;
      }

      const prompt = [
        'You write concise editorial metadata for financial education source content.',
        'Create exactly three key takeaways from the article and one recommended audience phrase.',
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

      const keyTakeaways = cleanTakeaways(generated.object.keyTakeaways);
      const recommendedAudience = cleanAudience(generated.object.recommendedAudience);
      if (keyTakeaways.length !== 3) {
        results.push({ id: row.id, title, status: 'failed', reason: 'AI returned fewer than three takeaways' });
        continue;
      }

      const update = await supabase
        .from('source_content')
        .update({ key_takeaways: keyTakeaways, recommended_audience: recommendedAudience || null })
        .eq('id', row.id);

      if (update.error) {
        results.push({ id: row.id, title, status: 'failed', reason: update.error.message });
        continue;
      }

      results.push({ id: row.id, title, status: 'updated', keyTakeaways, recommendedAudience });
    }

    return Response.json({
      ok: true,
      scanned: rows.length,
      updated: results.filter((item) => item.status === 'updated').length,
      skipped: results.filter((item) => item.status === 'skipped').length,
      failed: results.filter((item) => item.status === 'failed').length,
      results,
    });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || 'Failed to generate key takeaways.' }, { status: 500 });
  }
}
