'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, Loader2, Send, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    id: string;
    title: string;
    type: string;
    href?: string | null;
  }>;
};

const starterQuestions = [
  'How do I create a carousel from source content?',
  'When should I use EchoWrite?',
  'Why is my generated draft unfocused?',
  'How do I sync source content?',
];

function SourceLinks({ sources }: { sources?: ChatMessage['sources'] }) {
  if (!sources?.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.slice(0, 4).map((source) => {
        const label = `${source.type}: ${source.title}`;
        return source.href ? (
          <Badge key={source.id} asChild variant="secondary" className="max-w-full">
            <Link href={source.href}>
              <span className="truncate">{label}</span>
            </Link>
          </Badge>
        ) : (
          <Badge key={source.id} variant="secondary" className="max-w-full">
            <span className="truncate">{label}</span>
          </Badge>
        );
      })}
    </div>
  );
}

export function HelpChat() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiMessages = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.content })),
    [messages]
  );

  const ask = async (nextQuestion = question) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setQuestion('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/help-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          messages: [...apiMessages, userMessage],
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Help chat failed');
      }

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: String(json?.answer || ''),
          sources: Array.isArray(json?.sources) ? json.sources : [],
        },
      ]);
    } catch (err: any) {
      setError(err?.message || 'Help chat failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Ask Knowledge Center</p>
          <h3 className="text-xl font-semibold">Support chat</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Answers are limited to the Knowledge Center docs. The bot can guide you to the right
            workflow, but it cannot run syncs, generate content, or change records.
          </p>
        </div>
        <Badge variant="outline">Help-only</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.65fr]">
        <div className="rounded-md border border-border bg-background p-3">
          <div className="max-h-[360px] min-h-[180px] space-y-3 overflow-auto pr-1">
            {messages.length ? (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' ? (
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </span>
                  ) : null}
                  <div
                    className={`max-w-[86%] rounded-md border p-3 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'border-primary/30 bg-primary/10 text-foreground'
                        : 'border-border bg-card text-muted-foreground'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <SourceLinks sources={message.sources} />
                  </div>
                  {message.role === 'user' ? (
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                      <UserRound className="h-4 w-4" />
                    </span>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="flex h-full min-h-[160px] items-center justify-center rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                Ask a practical question about the app, like how to create a carousel,
                when to use EchoWrite, or how to refresh source content.
              </div>
            )}
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching the Knowledge Center...
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2">
            <Textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  ask();
                }
              }}
              placeholder="Ask how to use Editorial..."
              className="min-h-20 resize-none bg-muted/30"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Press Enter to ask. Shift+Enter adds a line.
              </p>
              <Button onClick={() => ask()} disabled={!question.trim() || loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Ask
              </Button>
            </div>
            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-md border border-border bg-secondary/35 p-4">
          <div className="mb-3 text-sm font-semibold">Suggested questions</div>
          <div className="grid gap-2">
            {starterQuestions.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => ask(starter)}
                disabled={loading}
                className="rounded-md border border-border bg-background p-3 text-left text-sm leading-5 transition-colors hover:border-primary/40 hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {starter}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
