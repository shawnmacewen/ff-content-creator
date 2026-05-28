import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  buildSourceStats,
  emptySourceContentFilters,
  emptySourceContentSummary,
  normalizeCachedFilters,
  normalizeCachedSummary,
} from '@/lib/source-content/stats';

async function readStats(supabase: ReturnType<typeof getSupabaseServerClient>) {
  const { data, error } = await supabase
    .from('source_content_stats')
    .select('key,value,refreshed_at')
    .in('key', ['source_filters', 'source_summary']);

  if (error) {
    return {
      filters: emptySourceContentFilters,
      summary: emptySourceContentSummary,
      refreshedAt: null,
      cacheMiss: true,
      error: error.message,
    };
  }

  const filtersRow = (data || []).find((row: any) => row.key === 'source_filters');
  const summaryRow = (data || []).find((row: any) => row.key === 'source_summary');

  return {
    filters: normalizeCachedFilters(filtersRow?.value),
    summary: normalizeCachedSummary(summaryRow?.value),
    refreshedAt: summaryRow?.refreshed_at || filtersRow?.refreshed_at || null,
    cacheMiss: !filtersRow || !summaryRow,
  };
}

export async function GET() {
  const supabase = getSupabaseServerClient();
  const stats = await readStats(supabase);
  return NextResponse.json({ ok: true, ...stats });
}

export async function POST() {
  const supabase = getSupabaseServerClient();
  const pageSize = 1000;
  const maxRows = 10000;
  const rows: any[] = [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    for (let from = 0; from < maxRows; from += pageSize) {
      const to = Math.min(from + pageSize - 1, maxRows - 1);
      const { data, error } = await supabase
        .from('source_content')
        .select('id,type,content_designation,tags,author,publisher,source_system,finra_approved,created_at,updated_at')
        .order('created_at', { ascending: false })
        .range(from, to)
        .abortSignal(controller.signal);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      rows.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.name === 'AbortError' ? 'source-stats-refresh-timeout' : (error?.message || 'source-stats-refresh-failed') },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }

  const stats = buildSourceStats(rows);
  const refreshedAt = new Date().toISOString();
  const { error } = await supabase
    .from('source_content_stats')
    .upsert([
      { key: 'source_filters', value: stats.filters, refreshed_at: refreshedAt },
      { key: 'source_summary', value: stats.summary, refreshed_at: refreshedAt },
    ]);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    refreshedAt,
    scannedRows: rows.length,
    capped: rows.length >= maxRows,
    ...stats,
  });
}
