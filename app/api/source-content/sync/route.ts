import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

interface SyncRequestBody {
  mode?: 'sample-seed' | 'provider';
  dryRun?: boolean;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as SyncRequestBody;
  const mode = body.mode || 'sample-seed';
  const dryRun = !!body.dryRun;

  if (mode !== 'sample-seed') {
    return NextResponse.json({
      ok: false,
      error: 'Provider sync not wired yet. Use mode=sample-seed for now.',
    }, { status: 400 });
  }

  const raw = await readFile(process.cwd() + '/data/content-samples-export.json', 'utf8');
  const parsed = JSON.parse(raw);
  const source = Array.isArray(parsed?.sourceContent) ? parsed.sourceContent : [];

  const rows = source.map((item: any) => ({
    external_id: item.id,
    source_system: 'sample-seed',
    type: item.type || 'article',
    title: item.title || 'Untitled',
    body: item.body || item.summary || '',
    author: item.author || null,
    tags: Array.isArray(item.tags) ? item.tags : [],
    published_at: item.publishedAt || null,
    metadata: {
      excerpt: item.excerpt || null,
      url: item.url || null,
      imageUrl: item.imageUrl || null,
      importedFrom: 'data/content-samples-export.json',
    },
  }));

  if (dryRun) {
    return NextResponse.json({ ok: true, mode, dryRun: true, wouldProcess: rows.length });
  }

  const supabase = getSupabaseServerClient();
  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const { data: existing } = await supabase
      .from('source_content')
      .select('id')
      .eq('source_system', row.source_system)
      .eq('external_id', row.external_id)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from('source_content')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      updated += 1;
    } else {
      const { error } = await supabase.from('source_content').insert(row);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      inserted += 1;
    }
  }

  return NextResponse.json({ ok: true, mode, dryRun: false, processed: rows.length, inserted, updated });
}
