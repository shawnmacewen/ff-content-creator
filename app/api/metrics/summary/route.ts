import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('generation_events')
    .select('tool,content_type');

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const byType: Record<string, number> = {};
  const byTool: Record<string, number> = {};
  for (const row of data || []) {
    const t = String((row as any).content_type || 'unknown');
    const tool = String((row as any).tool || 'unknown');
    byType[t] = (byType[t] || 0) + 1;
    byTool[tool] = (byTool[tool] || 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    totals: {
      lifetime: (data || []).length,
      byTool,
      byType,
    },
  });
}
