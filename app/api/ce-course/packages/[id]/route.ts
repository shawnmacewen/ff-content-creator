import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const MAX_CE_SOURCES = 10;

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function validateQuestions(questions: any[]) {
  const seen = new Set<string>();
  for (const [index, question] of questions.entries()) {
    const text = String(question?.question || '').trim();
    if (!text) return `Question ${index + 1} is missing text.`;
    const key = text.toLowerCase();
    if (seen.has(key)) return `Question ${index + 1} duplicates another question.`;
    seen.add(key);

    const choices = Array.isArray(question?.choices) ? question.choices : [];
    if (choices.length !== 4) return `Question ${index + 1} must have exactly four choices.`;
    if (!choices.every((choice: any) => String(choice?.text || '').trim())) return `Question ${index + 1} has an empty answer choice.`;
    if (!['A', 'B', 'C', 'D'].includes(String(question?.correctChoiceLabel || '').toUpperCase())) {
      return `Question ${index + 1} is missing a valid correct answer.`;
    }
    if (!String(question?.citation || '').trim()) return `Question ${index + 1} is missing a source citation.`;
  }
  return null;
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
    if (payload.source_content_ids.length < 1 || payload.source_content_ids.length > MAX_CE_SOURCES) {
      return NextResponse.json({ error: `Select between 1 and ${MAX_CE_SOURCES} source content items.` }, { status: 400 });
    }
    if (payload.questions.length < 10 || payload.questions.length > 25) {
      return NextResponse.json({ error: 'CE course quizzes must contain 10 to 25 questions.' }, { status: 400 });
    }
    const questionError = validateQuestions(payload.questions);
    if (questionError) return NextResponse.json({ error: questionError }, { status: 400 });

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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from('ce_course_packages').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
