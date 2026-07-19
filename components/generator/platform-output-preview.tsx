'use client';

import * as React from 'react';
import {
  BatteryFull,
  BarChart3,
  Bookmark,
  CheckCircle2,
  Heart,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Send,
  Share,
  Signal,
  Wifi,
} from 'lucide-react';
import type { ContentType } from '@/lib/types/content';
import { CONTENT_TYPE_MAP } from '@/lib/content-config';
import { cn } from '@/lib/utils';
import { XLogoIcon } from '@/components/generator/x-logo-icon';

function cleanGeneratedText(content: string) {
  return String(content || '')
    .replace(/\n*Image URL:\s*.*$/im, '')
    .replace(/\n*Image generation status:\s*.*$/im, '')
    .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\n\r]+/g, '[image-data]')
    .trim();
}

function getInlineImageSrc(content: string) {
  const imageLine = String(content || '').split('\n').find((line) => line.toLowerCase().startsWith('image url:'));
  return imageLine ? imageLine.slice('Image URL:'.length).trim() : null;
}

function firstMeaningfulLine(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean) || '';
}

function parseEmail(content: string) {
  const text = cleanGeneratedText(content);
  const lines = text.split('\n');
  const subjectIndex = lines.findIndex((line) => /^subject(?:\s+line)?\s*:/i.test(line.trim()));
  const preheaderIndex = lines.findIndex((line) => /^(?:preheader|preview\s+text)\s*:/i.test(line.trim()));

  const subject = subjectIndex >= 0
    ? lines[subjectIndex].replace(/^subject(?:\s+line)?\s*:\s*/i, '').trim()
    : firstMeaningfulLine(text).replace(/^#+\s*/, '').trim() || 'Generated campaign draft';

  const preheader = preheaderIndex >= 0
    ? lines[preheaderIndex].replace(/^(?:preheader|preview\s+text)\s*:\s*/i, '').trim()
    : 'Editorial preview';

  const body = lines
    .filter((_, index) => index !== subjectIndex && index !== preheaderIndex)
    .join('\n')
    .replace(/^#+\s*.*$/m, '')
    .trim();

  return { subject, preheader, body: body || text };
}

function parseEmailSequence(content: string) {
  const text = cleanGeneratedText(content);
  const matches = Array.from(text.matchAll(/(?:^|\n)#{0,3}\s*Touch\s+([123])\s*:?\s*([^\n]*)/gi));

  if (!matches.length) {
    return [
      { number: 1, role: 'Campaign email', ...parseEmail(text) },
    ];
  }

  return matches.map((match, index) => {
    const start = (match.index || 0) + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    const segment = text.slice(start, end).trim();
    const number = Number(match[1]) || index + 1;
    const role = match[2]?.trim() || `Touch ${number}`;
    return {
      number,
      role,
      ...parseEmail(segment),
    };
  }).slice(0, 3);
}

function PhoneShell({ children, variant = 'light' }: { children: React.ReactNode; variant?: 'light' | 'dark' }) {
  const dark = variant === 'dark';

  return (
    <div className="mx-auto w-full max-w-[390px] rounded-[2.5rem] border border-foreground/10 bg-black p-2 shadow-[0_20px_55px_rgba(15,23,42,0.22)]">
      <div
        className={cn(
          'relative overflow-hidden rounded-[2rem] text-sm',
          dark ? 'bg-black text-white' : 'bg-slate-100 text-slate-950'
        )}
      >
        <div className="pointer-events-none absolute left-1/2 top-2 z-20 h-7 w-24 -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" />
        <div className="flex h-10 items-center justify-between px-7 pt-2 text-[13px] font-semibold">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <Signal className="h-3.5 w-3.5" />
            <Wifi className="h-3.5 w-3.5" />
            <BatteryFull className="h-4 w-4" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Avatar({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-base font-black text-white', className)}>
      E
    </div>
  );
}

function LinkedInPreview({ content }: { content: string }) {
  const text = cleanGeneratedText(content);

  return (
    <div className="min-h-[520px] rounded-b-lg bg-emerald-50/45 px-4 py-6 sm:px-6">
      <article className="mx-auto w-full max-w-[680px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 px-4 py-3">
          <Avatar />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-950">editorial</span>
              <CheckCircle2 className="h-3.5 w-3.5 fill-[#0a66c2] text-white" />
            </div>
            <div className="text-[11px] leading-tight text-slate-500">Editorial content team · Now</div>
          </div>
          <MoreHorizontal className="h-5 w-5 text-slate-500" />
        </div>
        <div className="whitespace-pre-wrap px-4 pb-4 text-[14px] leading-relaxed text-slate-900">
          {text || 'Generated LinkedIn copy will appear here.'}
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">12 reactions · 3 comments</div>
        <div className="grid grid-cols-4 border-t border-slate-100 px-1 py-1 text-[12px] font-medium text-slate-600">
          <button className="rounded-md px-2 py-2 hover:bg-slate-50" type="button">Like</button>
          <button className="rounded-md px-2 py-2 hover:bg-slate-50" type="button">Comment</button>
          <button className="rounded-md px-2 py-2 hover:bg-slate-50" type="button">Repost</button>
          <button className="rounded-md px-2 py-2 hover:bg-slate-50" type="button">Send</button>
        </div>
      </article>
    </div>
  );
}

function XPreview({ content }: { content: string }) {
  const text = cleanGeneratedText(content);

  return (
    <PhoneShell variant="dark">
      <div className="flex items-center justify-center border-b border-white/10 px-4 py-3">
        <XLogoIcon className="h-5 w-5 text-white" />
      </div>
      <div className="min-h-[520px] bg-black">
        <article className="border-b border-white/10 px-4 py-4">
          <div className="flex items-start gap-3">
            <Avatar />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="font-bold">editorial</span>
                <CheckCircle2 className="h-3.5 w-3.5 fill-sky-500 text-black" />
                <span className="text-white/55">@editorial · 1m</span>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-white">
                {text || 'Generated X post will appear here.'}
              </div>
              <div className="mt-4 flex items-center justify-between text-white/55">
                <MessageCircle className="h-5 w-5" />
                <Repeat2 className="h-5 w-5" />
                <Heart className="h-5 w-5" />
                <Share className="h-5 w-5" />
              </div>
            </div>
          </div>
        </article>
      </div>
    </PhoneShell>
  );
}

function InstagramCaptionPreview({ content }: { content: string }) {
  const text = cleanGeneratedText(content);

  return (
    <PhoneShell variant="dark">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="text-2xl font-semibold tracking-normal" style={{ fontFamily: 'Brush Script MT, Segoe Script, cursive' }}>Instagram</div>
        <div className="flex items-center gap-4">
          <Heart className="h-6 w-6" />
          <Send className="h-6 w-6" />
        </div>
      </div>
      <div className="min-h-[520px] bg-black">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="ring-2 ring-emerald-300/50" />
            <span className="font-bold">editorial</span>
          </div>
          <MoreHorizontal className="h-5 w-5" />
        </div>
        <div className="mx-5 aspect-square rounded-xl bg-gradient-to-br from-sky-100 via-white to-emerald-100" />
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-5">
            <Heart className="h-6 w-6" />
            <MessageCircle className="h-6 w-6" />
            <Send className="h-6 w-6" />
          </div>
          <Bookmark className="h-6 w-6" />
        </div>
        <div className="whitespace-pre-wrap px-5 pb-6 text-[14px] leading-relaxed">
          <span className="font-bold">editorial </span>{text || 'Generated Instagram caption will appear here.'}
        </div>
      </div>
    </PhoneShell>
  );
}

function EmailPreview({ content, label }: { content: string; label?: string }) {
  const email = parseEmail(content);

  return (
    <div className="mx-auto w-full max-w-5xl rounded-2xl bg-slate-100/80 p-3 shadow-[0_22px_70px_rgba(15,23,42,0.16)] ring-1 ring-slate-200">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm">
        <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-slate-50 px-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Mail className="h-3.5 w-3.5" />
            Mail
          </div>
          <MoreHorizontal className="h-4 w-4 text-slate-400" />
        </div>

        <div className="grid min-h-[560px] gap-0 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden border-r border-slate-200 bg-slate-100/75 p-3 lg:block">
            <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Inbox</span>
              <span>Today</span>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <Avatar className="h-8 w-8 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-xs font-bold text-slate-950">Editorial Team</div>
                    <div className="shrink-0 text-[10px] text-slate-500">9:41 AM</div>
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs font-semibold leading-snug text-slate-800">{email.subject}</div>
                  <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">{email.preheader}</div>
                </div>
              </div>
            </div>
            <div className="mt-2 rounded-xl border border-transparent bg-white/60 p-3 text-xs text-slate-500">
              <div className="font-semibold text-slate-700">Drafts</div>
              <div className="mt-1">Campaign copy and saved previews</div>
            </div>
          </aside>

          <article className="bg-white">
            <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
              <div className="grid gap-1 text-xs text-slate-600">
                <div><span className="font-semibold text-slate-800">From:</span> Editorial Team &lt;editorial@advisors.com&gt;</div>
                <div><span className="font-semibold text-slate-800">To:</span> Advisor Audience</div>
                <div><span className="font-semibold text-slate-800">Subject:</span> <span className="font-bold text-slate-950">{email.subject}</span></div>
              </div>
            </div>

            <div className="bg-white px-4 py-4 sm:px-6">
              <div className="mb-3 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-slate-700">{email.preheader}</span>
                <span className="shrink-0 text-blue-600">View in browser</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-emerald-100 bg-[linear-gradient(135deg,#f0fbf8_0%,#ffffff_55%,#e5f6f2_100%)]">
                <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_180px] sm:p-7">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">{label || 'Marketing Email'}</div>
                    <h3 className="mt-2 max-w-xl text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">{email.subject}</h3>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-700">{email.preheader}</p>
                  </div>
                  <div className="hidden items-center justify-center sm:flex">
                    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-emerald-200/70 text-emerald-700 shadow-inner">
                      <Mail className="h-14 w-14" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 whitespace-pre-wrap rounded-xl border border-slate-100 bg-white p-5 text-sm leading-relaxed text-slate-800 shadow-sm">
                {email.body || 'Generated email copy will appear here.'}
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

function EmailSequencePreview({ content, label }: { content: string; label?: string }) {
  const emails = React.useMemo(() => parseEmailSequence(content), [content]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeEmail = emails[Math.min(activeIndex, emails.length - 1)] || emails[0];

  React.useEffect(() => {
    if (activeIndex >= emails.length) setActiveIndex(0);
  }, [activeIndex, emails.length]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-background p-2 shadow-sm">
        {emails.map((email, index) => (
          <button
            key={`${email.number}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={cn(
              'rounded-xl border px-3 py-2 text-left text-xs transition-colors',
              activeIndex === index
                ? 'border-primary/60 bg-primary/10 text-primary'
                : 'bg-background hover:bg-muted'
            )}
          >
            <span className="block font-semibold">Touch {email.number}</span>
            <span className="block max-w-[180px] truncate text-muted-foreground">{email.role}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white text-slate-950 shadow-sm">
        <div className="border-b bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Mail className="h-4 w-4" />
            {label || '3 Touch Email Sequence'} · Touch {activeEmail?.number || 1}
          </div>
        </div>
        <div className="grid gap-0 md:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="border-b bg-slate-50 p-3 md:border-b-0 md:border-r">
            <div className="space-y-2">
              {emails.map((email, index) => (
                <button
                  key={`${email.number}-inbox-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    'w-full rounded-lg bg-white p-3 text-left shadow-sm transition-colors',
                    activeIndex === index && 'ring-1 ring-primary/40'
                  )}
                >
                  <div className="text-xs font-semibold text-slate-900">editorial</div>
                  <div className="mt-1 line-clamp-2 text-xs text-slate-600">{email.subject}</div>
                </button>
              ))}
            </div>
          </aside>
          <article className="min-h-[430px] p-5">
            <div className="border-b pb-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{activeEmail?.role || 'Campaign email'}</div>
              <h3 className="text-xl font-semibold leading-snug">{activeEmail?.subject}</h3>
              <div className="mt-2 text-sm text-slate-500">{activeEmail?.preheader}</div>
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                <Avatar className="h-8 w-8 text-sm" />
                <div>
                  <div className="font-medium text-slate-800">Editorial Team</div>
                  <div>to advisor audience</div>
                </div>
              </div>
            </div>
            <div className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {activeEmail?.body || 'Generated email copy will appear here.'}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

function DocumentPreview({ content, type, label }: { content: string; type: ContentType; label?: string }) {
  const text = cleanGeneratedText(content);
  const typeLabel = label || CONTENT_TYPE_MAP[type]?.label || type;

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border bg-background p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3 border-b pb-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{typeLabel}</div>
          <h3 className="mt-1 text-lg font-semibold">Generated draft preview</h3>
        </div>
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {text || 'Generated copy will appear here.'}
      </div>
    </div>
  );
}

function InfographicPreview({ content }: { content: string }) {
  const imageSrc = getInlineImageSrc(content);
  const failed = /Image generation status:\s*failed/i.test(content);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded-2xl border bg-white text-slate-950 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <BarChart3 className="h-4 w-4 text-primary" />
            Website infographic
          </div>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
            1536 x 1024
          </span>
        </div>
        <div className="bg-[linear-gradient(180deg,#f8fafc,#eef2ff)] p-4 sm:p-6">
          <div className="mx-auto aspect-[3/2] w-full max-w-4xl overflow-hidden rounded-xl border bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            {imageSrc && !failed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc} alt="Generated website infographic" className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500">
                {failed ? 'Infographic image generation failed. The Infographic Copy output is still available in its own tab.' : 'Generated infographic image will appear here.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlatformOutputPreview({
  type,
  label,
  content,
}: {
  type: ContentType;
  label?: string;
  content: string;
}) {
  if (type === 'social-linkedin') return <LinkedInPreview content={content} />;
  if (type === 'social-twitter') return <XPreview content={content} />;
  if (type === 'social-instagram') return <InstagramCaptionPreview content={content} />;
  if (type === 'email-sequence') return <EmailSequencePreview content={content} label={label} />;
  if (type === 'email-marketing' || type === 'newsletter') return <EmailPreview content={content} label={label} />;
  if (type === 'infographic') return <InfographicPreview content={content} />;
  return <DocumentPreview content={content} type={type} label={label} />;
}
