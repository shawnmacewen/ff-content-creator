import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { ids, note } = await req.json();
  if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ ok: false, error: 'ids required' }, { status: 400 });
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('source_content')
    .update({ needs_update: true, audit_note: note || null, audit_marked_at: new Date().toISOString() })
    .in('id', ids);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, marked: ids.length });
}
