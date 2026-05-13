import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { ContentStatus, ToneType } from '@/lib/types/content';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('generated_content')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Generated content not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const {
    title,
    content,
    status,
    tone,
    prompt,
    sourceContentIds,
    versionNote,
  } = body as {
    title?: string;
    content?: string;
    status?: ContentStatus;
    tone?: ToneType;
    prompt?: string;
    sourceContentIds?: string[];
    versionNote?: string;
  };

  const supabase = getSupabaseServerClient();

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (title !== undefined) updatePayload.title = title;
  if (content !== undefined) updatePayload.content = content;
  if (status !== undefined) updatePayload.status = status;
  if (tone !== undefined) updatePayload.tone = tone;
  if (prompt !== undefined) updatePayload.prompt = prompt;
  if (sourceContentIds !== undefined) updatePayload.source_content_ids = sourceContentIds;

  const { data, error } = await supabase
    .from('generated_content')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Update failed' }, { status: 500 });
  }

  if (content !== undefined) {
    const { error: versionError } = await supabase.from('generated_content_versions').insert({
      generated_content_id: id,
      content,
      note: versionNote || 'Manual edit',
    });

    if (versionError) {
      return NextResponse.json({ error: versionError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ data });
}
