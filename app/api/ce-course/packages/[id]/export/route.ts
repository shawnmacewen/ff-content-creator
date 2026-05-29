import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const choiceLabels = ['A', 'B', 'C', 'D'];

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown) {
  return asArray(value).map((item) => String(item)).filter(Boolean);
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function normalizeReadingList(row: Record<string, any>, packagePayload: Record<string, any>) {
  const readingList = asArray(packagePayload.readingList).length
    ? asArray(packagePayload.readingList)
    : asArray(row.reading_list);

  return readingList.map((item, index) => {
    const source = asObject(item);
    return {
      order: index + 1,
      sourceContentId: String(source.id || ''),
      title: String(source.title || 'Untitled source'),
      publisher: String(source.publisher || ''),
      publishedAt: source.publishedAt || null,
      contentDesignation: String(source.contentDesignation || ''),
      tags: asStringArray(source.tags),
    };
  });
}

function normalizeQuestions(row: Record<string, any>, packagePayload: Record<string, any>) {
  const questions = asArray(packagePayload.questions).length
    ? asArray(packagePayload.questions)
    : asArray(row.questions);

  return questions.map((questionValue, index) => {
    const question = asObject(questionValue);
    const choices = asArray(question.choices).map((choiceValue, choiceIndex) => {
      const choice = asObject(choiceValue);
      const label = String(choice.label || choiceLabels[choiceIndex] || '');
      return {
        label,
        text: String(choice.text || choiceValue || ''),
      };
    });
    const correctChoiceLabel = String(question.correctChoiceLabel || 'A').toUpperCase();
    const correctChoice = choices.find((choice) => choice.label === correctChoiceLabel);

    return {
      id: String(question.id || `q-${index + 1}`),
      order: index + 1,
      sourceContentId: String(question.sourceId || ''),
      sourceTitle: String(question.sourceTitle || ''),
      difficulty: question.difficulty === 'medium' ? 'medium' : 'easy',
      question: String(question.question || ''),
      choices,
      correctChoiceLabel,
      answerKey: correctChoice ? correctChoice.text : '',
      explanation: String(question.explanation || ''),
      citation: String(question.citation || ''),
    };
  });
}

function buildExportPayload(row: Record<string, any>) {
  const packagePayload = asObject(row.package_payload);
  const readingList = normalizeReadingList(row, packagePayload);
  const quiz = normalizeQuestions(row, packagePayload);

  return {
    formatVersion: 'ce-course-package.v1',
    exportedAt: new Date().toISOString(),
    packageId: String(row.id || ''),
    status: String(packagePayload.status || row.status || 'draft'),
    title: String(packagePayload.title || row.title || ''),
    objective: String(packagePayload.objective || row.objective || ''),
    description: String(packagePayload.description || row.description || ''),
    theme: String(packagePayload.theme || row.theme || ''),
    coreThemes: asStringArray(packagePayload.coreThemes || row.core_themes),
    sourceContentIds: asStringArray(packagePayload.sourceContentIds || row.source_content_ids),
    readingListSummary: String(packagePayload.readingListSummary || row.reading_list_summary || ''),
    readingList,
    quiz,
    quizRules: {
      questionCount: quiz.length,
      minimumQuestions: 10,
      maximumQuestions: 25,
      choicesPerQuestion: 4,
      targetDifficulty: 'easy-to-medium',
      passingScore: Number(packagePayload.passingScore || row.passing_score || 60),
      materialsAvailableDuringQuiz: true,
      citationsRequired: true,
    },
    completionNotes: String(packagePayload.completionNotes || row.completion_notes || ''),
    downstream: {
      advisorStreamStatus: 'pending-format-confirmation',
      outboundApiReady: true,
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

  return NextResponse.json({ data: buildExportPayload(data) });
}
