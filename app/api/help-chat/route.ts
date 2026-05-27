import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getServerEnv } from '@/lib/env';
import { searchHelpContent } from '@/lib/help-center-search';

type HelpChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

function cleanMessages(input: unknown): HelpChatMessage[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((message) => ({
      role: message?.role === 'assistant' ? 'assistant' : 'user',
      content: String(message?.content || '').trim().slice(0, 2000),
    }))
    .filter((message) => message.content)
    .slice(-6);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages = cleanMessages(body?.messages);
    const question = String(body?.question || messages.at(-1)?.content || '').trim();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const sources = searchHelpContent(question, 8);
    if (!sources.length) {
      return NextResponse.json({
        answer:
          "I don't have a Knowledge Center entry for that yet. Try asking about Source Content, Generate Content, EchoWrite, Content Scan, Saved Content, Settings, sync, carousel generation, or saved draft review.",
        sources: [],
        model: null,
      });
    }

    const env = getServerEnv();
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const context = sources
      .map((source, index) => {
        return [
          `[${index + 1}] ${source.type}: ${source.title}`,
          source.href ? `Link: ${source.href}` : null,
          source.text,
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n\n---\n\n');

    const history = messages
      .slice(0, -1)
      .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
      .join('\n');

    const result = await generateText({
      model: openai(env.HELP_CHAT_MODEL),
      temperature: 0.2,
      maxOutputTokens: 700,
      system: [
        'You are the Editorial Knowledge Center support assistant.',
        'You are isolated to the provided Knowledge Center context.',
        'Answer only from the provided context. Do not invent app behavior, policies, compliance rules, or hidden features.',
        'If the context does not answer the question, say that the Knowledge Center does not cover it yet and suggest the closest related guide.',
        'Do not perform actions. Do not say you changed settings, ran syncs, generated content, or saved drafts.',
        'Use concise practical steps. Prefer numbered lists for workflows.',
        'Mention relevant source titles in a short "From:" line at the end.',
      ].join('\n'),
      prompt: [
        history ? `Recent chat:\n${history}` : null,
        `User question:\n${question}`,
        `Knowledge Center context:\n${context}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    });

    return NextResponse.json({
      answer: result.text.trim(),
      sources: sources.map((source) => ({
        id: source.id,
        title: source.title,
        type: source.type,
        href: source.href || null,
        score: source.score,
      })),
      model: env.HELP_CHAT_MODEL,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Help chat failed' },
      { status: 500 }
    );
  }
}
