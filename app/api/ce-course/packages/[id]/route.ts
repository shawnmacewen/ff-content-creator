import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function buildUpdatePayload(body: any) {
  const sourceContentIds = asStringArray(body?.sourceContentIds);
  const questions = Array.isArray(body?.questions) ? body.questions : [];
  const readingList = Array.isArray(body?.readingList) ? body.readingList : [];

  return {
    title: String(body?.title || '').trim(),
    objective: String(body?.objective || '').trim(),
    description: String(body?.description || '').trim(),
    theme: String(body?.theme || '').trim(),
    reading_list_summary: String(body?.readingListSummary || '').trim(),
    core_themes: asStringArray(body?.coreThemes),
    source_content_ids: sourceContentIds,
    reading_list: readingList,
    questions,
    passing_score: Number(body?.passingScore || 60),
    completion_notes: String(body?.completionNotes || '').trim(),
    status: String(body?.status || 'draft'),
    updated_at: new Date().toISOString(),
    package_payload: {
      title: String(body?.title || '').trim(),
      objective: String(body?.objective || '').trim(),
      description: String(body?.description || '').trim(),
      theme: String(body?.theme || '').trim(),
      readingListSummary: String(body?.readingListSummary || '').trim(),
      coreThemes: asStringArray(body?.coreThemes),
      sourceContentIds,
      readingList,
      questions,
      passingScore: Number(body?.passingScore || 60),
      completionNotes: String(body?.completionNotes || '').trim(),
      status: String(body?.status || 'draft'),
    },
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('ce_course_packages')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'CE course package not found.' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const payload = buildUpdatePayload(body);

    if (!payload.title || !payload.objective) {
      return NextResponse.json({ error: 'Missing required fields: title and objective.' }, { status: 400 });
    }
    if (payload.source_content_ids.length < 1 || payload.source_content_ids.length > 5) {
      return NextResponse.json({ error: 'Select between 1 and 5 source content items.' }, { status: 400 });
    }
    if (payload.questions.length < 10 || payload.questions.length > 25) {
      return NextResponse.json({ error: 'CE course quizzes must contain 10 to 25 questions.' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('ce_course_packages')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to update CE course package.' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update CE course package.' }, { status: 500 });
  }
}
