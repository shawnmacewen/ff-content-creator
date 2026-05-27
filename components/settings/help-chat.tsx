'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, HelpCircle, Loader2, MessageCircle, Send, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          aria-label="Open Knowledge Center support chat"
          className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full shadow-lg shadow-primary/25 sm:bottom-7 sm:right-7"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] max-w-[min(720px,calc(100vw-2rem))] grid-rows-[auto_1fr_auto] flex-col gap-0 overflow-hidden p-0 sm:rounded-xl">
        <DialogHeader className="border-b border-border bg-card px-5 py-4 pr-12 text-left">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-lg">Knowledge Center help</DialogTitle>
                <Badge variant="outline">Help-only</Badge>
              </div>
              <DialogDescription className="mt-1 leading-5">
                Ask about Editorial workflows and tools. This chat only uses Knowledge Center docs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-[360px] flex-1 overflow-y-auto bg-background px-4 py-4 sm:min-h-[430px] sm:px-5">
          {messages.length ? (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' ? (
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </span>
                  ) : null}
                  <div
                    className={`max-w-[82%] rounded-2xl border px-4 py-3 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'rounded-br-md border-primary/25 bg-primary text-primary-foreground'
                        : 'rounded-bl-md border-border bg-card text-muted-foreground shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <SourceLinks sources={message.sources} />
                  </div>
                  {message.role === 'user' ? (
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                      <UserRound className="h-4 w-4" />
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[320px] content-center gap-4 text-center sm:min-h-[390px]">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <HelpCircle className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-base font-semibold">How can I help?</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Ask a practical question about creating content, using EchoWrite, refreshing
                  source content, scanning records, or finding saved drafts.
                </p>
              </div>
              <div className="mx-auto grid w-full max-w-lg gap-2 sm:grid-cols-2">
                {starterQuestions.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => ask(starter)}
                    disabled={loading}
                    className="rounded-md border border-border bg-card p-3 text-left text-sm leading-5 transition-colors hover:border-primary/40 hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}
          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching the Knowledge Center...
            </div>
          ) : null}
        </div>

        <div className="border-t border-border bg-card p-4">
          {error ? (
            <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <div className="grid gap-2">
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
              className="min-h-20 resize-none bg-background"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Enter sends. Shift+Enter adds a line.
              </p>
              <Button onClick={() => ask()} disabled={!question.trim() || loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
