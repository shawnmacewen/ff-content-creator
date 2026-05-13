import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  getAdvisorStreamConfig,
  getAdvisorStreamAccessToken,
  mapAdvisorStreamSearchResults,
  searchAdvisorStreamArticles,
  validateAdvisorStreamConfig,
} from '@/lib/integrations/advisorstream/provider';

interface SyncRequestBody {
  mode?: 'sample-seed' | 'provider';
  dryRun?: boolean;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as SyncRequestBody;
  const mode = body.mode || 'sample-seed';
  const dryRun = !!body.dryRun;

  let rows: any[] = [];

  if (mode === 'sample-seed') {
    const raw = await readFile(process.cwd() + '/data/content-samples-export.json', 'utf8');
    const parsed = JSON.parse(raw);
    const source = Array.isArray(parsed?.sourceContent) ? parsed.sourceContent : [];

    rows = source.map((item: any) => ({
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
  } else if (mode === 'provider') {
    const config = getAdvisorStreamConfig();
    if (!validateAdvisorStreamConfig(config)) {
      return NextResponse.json(
        { ok: false, error: 'AdvisorStream env vars are not fully configured' },
        { status: 400 }
      );
    }

    try {
      const token = await getAdvisorStreamAccessToken(config);
      const payload = await searchAdvisorStreamArticles(config, token, { limit: 25, offset: 0 });
      const normalized = mapAdvisorStreamSearchResults(payload);

      if (!normalized.length) {
        const maybeErrors = (payload as any)?.errors;
        return NextResponse.json({
          ok: true,
          mode,
          dryRun,
          processed: 0,
          inserted: 0,
          updated: 0,
          debug: {
            payloadKeys: Object.keys(payload || {}),
            payloadMeta: (payload as any)?.meta || null,
            payloadErrors: maybeErrors || null,
            dataType: Array.isArray((payload as any)?.data)
              ? 'array'
              : typeof (payload as any)?.data,
            dataKeys: (payload as any)?.data && typeof (payload as any)?.data === 'object'
              ? Object.keys((payload as any).data)
              : [],
            sampleKeys: Object.keys(
              (payload as any)?.results?.[0] ||
              (payload as any)?.items?.[0] ||
              (payload as any)?.data?.[0] ||
              (payload as any)?.data?.results?.[0] ||
              (payload as any)?.data?.items?.[0] ||
              (payload as any)?.data?.articles?.[0] ||
              (payload as any)?.data?.records?.[0] ||
              {}
            ),
          },
        });
      }

      rows = normalized.map((item) => ({
        external_id: item.externalId,
        source_system: item.sourceSystem,
        type: item.type,
        title: item.title,
        body: item.body,
        author: item.author || null,
        tags: item.tags || [],
        published_at: item.publishedAt || null,
        metadata: {
          excerpt: item.excerpt || null,
          url: item.url || null,
          imageUrl: item.imageUrl || null,
          ...item.metadata,
        },
      }));
    } catch (error: any) {
      return NextResponse.json(
        { ok: false, error: error?.message || 'Provider sync failed' },
        { status: 502 }
      );
    }
  } else {
    return NextResponse.json({ ok: false, error: `Unsupported mode: ${mode}` }, { status: 400 });
  }

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
