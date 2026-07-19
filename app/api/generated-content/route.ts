import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { ContentStatus, ContentType, ToneType } from '@/lib/types/content';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const q = searchParams.get('q') || '';
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;

    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('generated_content')
      .select('*, generated_content_versions(id,note,created_at)')
      .order('updated_at', { ascending: false })
      .limit(200);

    if (q) query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
    if (type && type !== 'all') query = query.eq('type', type);
    if (status && status !== 'all') query = query.eq('status', status);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const { data, error } = await (async () => {
      try {
        return await query.abortSignal(controller.signal);
      } finally {
        clearTimeout(timeout);
      }
    })();

    if (error) return NextResponse.json({ data: [], fallback: true, fallbackReason: error.message });

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    return NextResponse.json({ data: [], fallback: true, fallbackReason: error?.message || 'database-unavailable' });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    type,
    title,
    content,
    sourceContentIds,
    prompt,
    tone,
    status,
    versionNote,
  } = body as {
    type: ContentType;
    title: string;
    content: string;
    sourceContentIds?: string[];
    prompt?: string;
    tone: ToneType;
    status: ContentStatus;
    versionNote?: string;
  };

  if (!type || !title || !content || !tone || !status) {
    return NextResponse.json(
      { error: 'Missing required fields: type, title, content, tone, status' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();

  const { data: inserted, error: insertError } = await supabase
    .from('generated_content')
    .insert({
      type,
      title,
      content,
      source_content_ids: sourceContentIds || [],
      prompt: prompt || '',
      tone,
      status,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ error: insertError?.message || 'Insert failed' }, { status: 500 });
  }

  const { error: versionError } = await supabase.from('generated_content_versions').insert({
    generated_content_id: inserted.id,
    content,
    note: versionNote || 'Initial generation',
  });

  if (versionError) {
    return NextResponse.json({ error: versionError.message }, { status: 500 });
  }

  return NextResponse.json({ data: inserted }, { status: 201 });
}
