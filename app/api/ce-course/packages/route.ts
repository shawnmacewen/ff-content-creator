import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function normalizeQuestions(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function buildInsertPayload(body: any) {
  const sourceContentIds = asStringArray(body?.sourceContentIds);
  const questions = normalizeQuestions(body?.questions);
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('ce_course_packages')
      .select('id,title,objective,description,theme,reading_list_summary,core_themes,source_content_ids,passing_score,status,created_at,updated_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (q) query = query.or(`title.ilike.%${q}%,objective.ilike.%${q}%,theme.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load CE course packages.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = buildInsertPayload(body);

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
      .insert(payload)
      .select('*')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to save CE course package.' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save CE course package.' }, { status: 500 });
  }
}
