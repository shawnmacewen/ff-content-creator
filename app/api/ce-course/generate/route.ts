import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { recordGenerationEvent } from '@/lib/generation-events';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getCanonicalBody } from '@/lib/source-content/body';

const ChoiceSchema = z.object({
  label: z.enum(['A', 'B', 'C', 'D']),
  text: z.string().min(1),
});

const QuestionSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  sourceTitle: z.string().min(1),
  question: z.string().min(1),
  choices: z.array(ChoiceSchema).length(4),
  correctChoiceLabel: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().min(1),
  citation: z.string().min(1),
  difficulty: z.enum(['easy', 'medium']),
});

const CoursePackageSchema = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),
  description: z.string().min(1),
  theme: z.string().min(1),
  readingListSummary: z.string().min(1),
  coreThemes: z.array(z.string().min(1)).min(1).max(8),
  passingScore: z.number().min(0).max(100),
  completionNotes: z.string().min(1),
  questions: z.array(QuestionSchema).min(10).max(25),
});

function normalizeQuestionCount(sourceCount: number) {
  return Math.min(25, Math.max(10, sourceCount * 5));
}

function decodeHtmlEntities(input: string) {
  return String(input || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function safeArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function mapSource(row: any) {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const categories = [
    ...safeArray(row?.categories),
    ...safeArray(row?.sub_categories),
    ...safeArray(metadata?.categories),
    ...safeArray(metadata?.subCategories),
    ...safeArray(row?.tags),
  ].map((item) => decodeHtmlEntities(String(item))).filter(Boolean);

  return {
    id: String(row.id),
    title: decodeHtmlEntities(String(row.title || 'Untitled source')),
    author: String(row.author || 'Unknown'),
    publisher: String(row.publisher || row.source_system || 'Forefield'),
    publishedAt: row.published_at || null,
    tags: Array.from(new Set(categories)).slice(0, 10),
    body: getCanonicalBody(row).slice(0, 9000),
  };
}

function buildSourcePrompt(sources: ReturnType<typeof mapSource>[]) {
  return sources.map((source, index) => [
    `SOURCE ${index + 1}`,
    `id: ${source.id}`,
    `title: ${source.title}`,
    `author: ${source.author}`,
    `publisher: ${source.publisher}`,
    `publishedAt: ${source.publishedAt || 'unknown'}`,
    `tags: ${source.tags.join(', ') || 'none'}`,
    '',
    source.body,
  ].join('\n')).join('\n\n---\n\n');
}

function normalizePackage(input: z.infer<typeof CoursePackageSchema>, sources: ReturnType<typeof mapSource>[], questionCount: number) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const sourceIds = new Set(sources.map((source) => source.id));
  const fallbackSource = sources[0];

  const seenQuestionText = new Set<string>();
  const questions = input.questions.slice(0, questionCount).map((question, index) => {
    const source = sourceIds.has(question.sourceId) ? sourceById.get(question.sourceId)! : fallbackSource;
    const choices = question.choices.slice(0, 4);
    while (choices.length < 4) {
      const label = ['A', 'B', 'C', 'D'][choices.length] as 'A' | 'B' | 'C' | 'D';
      choices.push({ label, text: 'Review the source material for this option.' });
    }

    const questionText = question.question.trim();
    const normalizedQuestionText = questionText.toLowerCase();
    const dedupedQuestionText = seenQuestionText.has(normalizedQuestionText)
      ? `${questionText} (from ${source.title})`
      : questionText;
    seenQuestionText.add(normalizedQuestionText);

    return {
      id: question.id || `q-${index + 1}`,
      sourceId: source.id,
      sourceTitle: question.sourceTitle || source.title,
      question: dedupedQuestionText,
      choices: choices.map((choice, choiceIndex) => ({
        label: ['A', 'B', 'C', 'D'][choiceIndex],
        text: choice.text,
      })),
      correctChoiceLabel: ['A', 'B', 'C', 'D'].includes(question.correctChoiceLabel) ? question.correctChoiceLabel : 'A',
      explanation: question.explanation,
      citation: question.citation || source.title,
      difficulty: question.difficulty === 'medium' ? 'medium' : 'easy',
    };
  });

  return {
    ...input,
    passingScore: 60,
    questions,
    sourceContentIds: sources.map((source) => source.id),
    readingList: sources.map((source) => ({
      id: source.id,
      title: source.title,
      publisher: source.publisher,
      publishedAt: source.publishedAt,
      tags: source.tags,
    })),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sourceContentIds = Array.isArray(body?.sourceContentIds)
      ? body.sourceContentIds.map((id: unknown) => String(id)).filter(Boolean)
      : [];

    if (sourceContentIds.length < 1 || sourceContentIds.length > 5) {
      return Response.json({ error: 'Select between 1 and 5 source content items.' }, { status: 400 });
    }

    const env = getServerEnv();
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('source_content')
      .select('id,title,author,publisher,source_system,published_at,tags,categories,sub_categories,metadata,body_text,body')
      .in('id', sourceContentIds);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!data?.length) return Response.json({ error: 'Selected source content was not found.' }, { status: 404 });

    const sources = data.map(mapSource).filter((source) => source.body.trim().length > 0);
    if (!sources.length) return Response.json({ error: 'Selected source content has no readable body text.' }, { status: 400 });

    const questionCount = normalizeQuestionCount(sources.length);
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const sourcePrompt = buildSourcePrompt(sources);

    const result = await generateObject({
      model: openai(env.OPENAI_MODEL),
      schema: CoursePackageSchema,
      temperature: 0.25,
      prompt: [
        'You create continuing education course packages for financial-services learners.',
        'Use ONLY the provided source material. Do not invent facts, regulator claims, statistics, or requirements.',
        '',
        'Create a complete CE course package.',
        `Question count: exactly ${questionCount}.`,
        'Quiz rules:',
        '- Multiple choice only.',
        '- Exactly four choices per question, labels A, B, C, D.',
        '- Exactly one correct answer.',
        '- Do not repeat the same question, wording pattern, or correct answer across the quiz.',
        '- Make each answer choice plausible but clearly distinguishable from the source-backed correct answer.',
        '- Difficulty must be easy or medium. Do not write trick questions.',
        '- Questions should confirm the learner read and understood the material.',
        '- Each question must cite one selected source using its sourceId and title.',
        '- Spread questions across selected sources as evenly as possible.',
        '- Use passingScore=60.',
        '',
        'Course package fields:',
        '- title',
        '- objective',
        '- description',
        '- theme',
        '- readingListSummary',
        '- coreThemes',
        '- passingScore',
        '- completionNotes',
        '- questions',
        '',
        'For explanations, briefly explain why the correct answer is correct using the source material.',
        '',
        'SOURCE MATERIAL:',
        sourcePrompt.slice(0, 36000),
      ].join('\n'),
    });

    const coursePackage = normalizePackage(result.object, sources, questionCount);

    await recordGenerationEvent({
      tool: 'ce-course-creator',
      contentType: 'quiz',
      category: 'content',
      assetCount: coursePackage.questions.length,
      model: env.OPENAI_MODEL,
      meta: {
        sourceContentCount: sources.length,
        questionCount: coursePackage.questions.length,
      },
    });

    return Response.json({ coursePackage });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to generate CE course package.' }, { status: 500 });
  }
}
