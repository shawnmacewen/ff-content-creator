'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  Boxes,
  BrainCircuit,
  CalendarCheck,
  CheckCircle2,
  DatabaseZap,
  FileSearch,
  Layers3,
  Mail,
  Megaphone,
  MessageSquareText,
  PenSquare,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mapGeneratedContentRows } from '@/lib/mappers/generated-content';
import type { GeneratedContent } from '@/lib/types/content';

type Icon = ComponentType<{ className?: string }>;

type Accent = {
  icon: string;
  panel: string;
  border: string;
  text: string;
  bar: string;
  badge: string;
  wash: string;
};

const accents: Accent[] = [
  {
    icon: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
    panel: 'bg-blue-50/70 dark:bg-blue-500/10',
    border: 'border-blue-200/75 dark:border-blue-400/20',
    text: 'text-blue-700 dark:text-blue-200',
    bar: 'bg-blue-500',
    badge: 'bg-blue-600 text-white dark:bg-blue-400 dark:text-blue-950',
    wash: 'from-blue-500/10 to-transparent',
  },
  {
    icon: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
    panel: 'bg-violet-50/70 dark:bg-violet-500/10',
    border: 'border-violet-200/75 dark:border-violet-400/20',
    text: 'text-violet-700 dark:text-violet-200',
    bar: 'bg-violet-500',
    badge: 'bg-violet-600 text-white dark:bg-violet-400 dark:text-violet-950',
    wash: 'from-violet-500/10 to-transparent',
  },
  {
    icon: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200',
    panel: 'bg-cyan-50/70 dark:bg-cyan-500/10',
    border: 'border-cyan-200/75 dark:border-cyan-400/20',
    text: 'text-cyan-700 dark:text-cyan-200',
    bar: 'bg-cyan-500',
    badge: 'bg-cyan-600 text-white dark:bg-cyan-400 dark:text-cyan-950',
    wash: 'from-cyan-500/10 to-transparent',
  },
  {
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
    panel: 'bg-emerald-50/70 dark:bg-emerald-500/10',
    border: 'border-emerald-200/75 dark:border-emerald-400/20',
    text: 'text-emerald-700 dark:text-emerald-200',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-emerald-950',
    wash: 'from-emerald-500/10 to-transparent',
  },
  {
    icon: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200',
    panel: 'bg-sky-50/70 dark:bg-sky-500/10',
    border: 'border-sky-200/75 dark:border-sky-400/20',
    text: 'text-sky-700 dark:text-sky-200',
    bar: 'bg-sky-500',
    badge: 'bg-sky-600 text-white dark:bg-sky-400 dark:text-sky-950',
    wash: 'from-sky-500/10 to-transparent',
  },
];

const journeySteps: { title: string; detail: string; icon: Icon; accent: Accent }[] = [
  {
    title: 'Discover',
    detail: 'Sync source articles, provider metadata, and editorial topics.',
    icon: DatabaseZap,
    accent: accents[0],
  },
  {
    title: 'Create',
    detail: 'Transform source material into channel-specific assets.',
    icon: Sparkles,
    accent: accents[1],
  },
  {
    title: 'Review',
    detail: 'Inspect tone, source context, formatting, and internal readiness.',
    icon: ShieldCheck,
    accent: accents[2],
  },
  {
    title: 'Publish',
    detail: 'Move approved content into saved content and distribution flows.',
    icon: Send,
    accent: accents[3],
  },
  {
    title: 'Measure',
    detail: 'Track saved output mix and identify the next workflow priority.',
    icon: TrendingUp,
    accent: accents[4],
  },
];

const workflowRows: {
  title: string;
  role: string;
  detail: string;
  href: string;
  icon: Icon;
  accent: Accent;
  outcome: string;
  stages: { title: string; detail: string; icon: Icon }[];
}[] = [
  {
    title: 'Convert source content into reusable assets',
    role: 'Editorial production',
    detail: 'Turn one source record into social, email, article, and carousel-ready drafts.',
    href: '/generate',
    icon: Megaphone,
    accent: accents[0],
    outcome: 'Source material becomes easier to reuse',
    stages: [
      { title: 'Source article', detail: 'Broadridge content selected', icon: DatabaseZap },
      { title: 'Generate kit', detail: 'Drafts created by format', icon: Sparkles },
      { title: 'Save outputs', detail: 'Assets ready to reuse', icon: Layers3 },
    ],
  },
  {
    title: 'Build repeatable content packages',
    role: 'Editorial planning',
    detail: 'Package related drafts so recurring publishing needs stay consistent across formats.',
    href: '/generate?type=email',
    icon: CalendarCheck,
    accent: accents[1],
    outcome: 'Recurring content work becomes repeatable',
    stages: [
      { title: 'Content goal', detail: 'Topic and format defined', icon: PenSquare },
      { title: 'Email copy', detail: 'Newsletter draft prepared', icon: Mail },
      { title: 'Format package', detail: 'Reusable asset group', icon: Send },
    ],
  },
  {
    title: 'Centralize editorial QA',
    role: 'Editorial review',
    detail: 'Review source context, disclosures, formatting, and saved outputs from one workspace.',
    href: '/audit',
    icon: ShieldCheck,
    accent: accents[2],
    outcome: 'Review context stays visible',
    stages: [
      { title: 'Scan content', detail: 'Find risk signals and gaps', icon: FileSearch },
      { title: 'Review context', detail: 'Source attribution stays visible', icon: BadgeCheck },
      { title: 'Approve library', detail: 'Durable saved content record', icon: CheckCircle2 },
    ],
  },
  {
    title: 'Improve content findability',
    role: 'Source curation',
    detail: 'Use source discovery and EchoWrite to shape clear internal content records and drafts.',
    href: '/echo-write',
    icon: UsersRound,
    accent: accents[3],
    outcome: 'Useful source content becomes easier to find',
    stages: [
      { title: 'Find themes', detail: 'Search source inventory', icon: BookOpenCheck },
      { title: 'Draft copy', detail: 'Long-form editorial content', icon: PenSquare },
      { title: 'Publish-ready', detail: 'Content can move to review', icon: Send },
    ],
  },
  {
    title: 'Prioritize the next editorial pass',
    role: 'Editorial operations',
    detail: 'Use workspace signals to understand output mix and prioritize source updates or new drafts.',
    href: '/library',
    icon: BrainCircuit,
    accent: accents[4],
    outcome: 'Next best content priorities are clearer',
    stages: [
      { title: 'Saved profile', detail: 'Generated assets organized', icon: MessageSquareText },
      { title: 'Impact signals', detail: 'Format mix and freshness', icon: BarChart3 },
      { title: 'Next action', detail: 'Priorities stay visible', icon: TrendingUp },
    ],
  },
];

const platformPillars: { title: string; detail: string; icon: Icon; accent: Accent }[] = [
  {
    title: 'AI-powered content',
    detail: 'Synced source inventory, provider metadata, and searchable knowledge assets.',
    icon: BrainCircuit,
    accent: accents[1],
  },
  {
    title: 'Omnichannel execution',
    detail: 'Configurable formats for social, email, newsletter, article, and carousel output.',
    icon: Boxes,
    accent: accents[0],
  },
  {
    title: 'Editorial QA',
    detail: 'Generated and edited content moves into a durable, reviewable asset library.',
    icon: ShieldCheck,
    accent: accents[2],
  },
  {
    title: 'Performance insight',
    detail: 'Dashboard signals show content mix, output velocity, and workflow readiness.',
    icon: BarChart3,
    accent: accents[4],
  },
];

const outcomes = [
  'Find useful source content faster',
  'Create more reusable content assets',
  'Review drafts more consistently',
  'Reuse approved work across channels',
  'Show visible editorial throughput',
];

const workflowHealth = [
  { label: 'Content sync ready', icon: DatabaseZap, accent: accents[0] },
  { label: 'Generation routes online', icon: Sparkles, accent: accents[1] },
  { label: 'Review workspace connected', icon: ShieldCheck, accent: accents[2] },
];

const heroSignals = [
  { label: 'Source', value: 'Synced', accent: accents[0] },
  { label: 'AI', value: 'Ready', accent: accents[1] },
  { label: 'Review', value: 'Active', accent: accents[2] },
  { label: 'Library', value: 'Reusable', accent: accents[3] },
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data } = useSWR<{ data: GeneratedContent[] }>(
    mounted ? '/api/generated-content' : null,
    fetcher
  );

  const content = useMemo(
    () => mapGeneratedContentRows(data?.data || []),
    [data?.data]
  );

  const metrics = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const generatedThisWeek = content.filter((c) => new Date(c.createdAt) >= weekAgo).length;
    const socialCount = content.filter((c) => (c.type || '').startsWith('social-')).length;
    const emailCount = content.filter((c) => (c.type || '').includes('email') || (c.type || '').includes('newsletter')).length;
    const longFormCount = content.filter((c) => ['article', 'infographic-copy', 'faq', 'video-script'].includes(c.type || '')).length;

    return [
      {
        label: 'Generated assets',
        value: content.length,
        detail: 'Total saved outputs',
        icon: Sparkles,
      },
      {
        label: 'This week',
        value: generatedThisWeek,
        detail: 'New reusable assets',
        icon: TrendingUp,
      },
      {
        label: 'Social-ready',
        value: socialCount,
        detail: 'Posts and captions',
        icon: MessageSquareText,
      },
      {
        label: 'Email + long form',
        value: emailCount + longFormCount,
        detail: `${emailCount} email, ${longFormCount} editorial`,
        icon: Mail,
      },
    ];
  }, [content]);

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-[linear-gradient(135deg,#11285a_0%,#143a7b_58%,#0f6f8f_100%)] p-6 text-white sm:p-8">
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
              Turn trusted source content into organized editorial assets.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-50/85 sm:text-base">
              Editorial brings synced source material, AI-assisted generation, review context,
              and reusable content assets into one workspace for the internal editorial team.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="bg-white text-[#12306a] hover:bg-blue-50">
                <Link href="/generate">
                  Generate Content
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/settings">Manage Platform</Link>
              </Button>
            </div>
          </div>

          <div className="grid content-between gap-6 bg-secondary/60 p-6 sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Workflow Health
              </p>
              <div className="mt-3 grid gap-3">
                {workflowHealth.map((item) => (
                  <div key={item.label} className={`flex items-center gap-3 rounded-md border bg-card p-3 ${item.accent.border}`}>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-md ${item.accent.icon}`}>
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                    <BadgeCheck className="ml-auto h-4 w-4 text-success" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Editorial output mix</p>
                  <p className="text-xs text-muted-foreground">
                    Social, email, and editorial formats from one workflow.
                  </p>
                </div>
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {['Social', 'Email', 'Articles'].map((label, index) => (
                  <div key={label} className="rounded-md bg-muted p-3 text-center">
                    <div className={`mx-auto mb-2 h-1.5 rounded-full ${accents[index].bar}`} style={{ width: `${85 - index * 16}%` }} />
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {heroSignals.map((signal) => (
                <div
                  key={signal.label}
                  className={`rounded-md border bg-gradient-to-br p-3 ${signal.accent.border} ${signal.accent.wash}`}
                >
                  <p className={`text-[11px] font-semibold uppercase ${signal.accent.text}`}>
                    {signal.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{signal.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={metric.label} className="overflow-hidden rounded-lg border-border bg-card shadow-sm">
            <div className={`h-1 ${accents[index % accents.length].bar}`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
              <span className={`flex h-8 w-8 items-center justify-center rounded-md ${accents[index % accents.length].icon}`}>
                <metric.icon className="h-4 w-4" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{metric.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Operating Journey</p>
            <h2 className="text-xl font-semibold">From source article to reusable editorial asset</h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            The dashboard now uses the design template&apos;s workflow-coded color, status, and outcome cues.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {journeySteps.map((step, index) => (
            <div key={step.title} className={`relative overflow-hidden rounded-md border p-4 ${step.accent.border} ${step.accent.panel}`}>
              <div className={`absolute inset-x-0 top-0 h-1 ${step.accent.bar}`} />
              <div className="mb-4 flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-md ${step.accent.icon}`}>
                  <step.icon className="h-4 w-4" />
                </span>
                <span className={`text-xs font-semibold ${step.accent.text}`}>
                  0{index + 1}
                </span>
              </div>
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Priority Workflows</p>
              <h2 className="text-xl font-semibold">5 key scenarios for the editorial team</h2>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/generate">Open Generator</Link>
            </Button>
          </div>
          <div className="grid gap-3">
            {workflowRows.map((scenario, index) => (
              <Link
                key={scenario.title}
                href={scenario.href}
                className={`group relative grid gap-4 overflow-hidden rounded-md border bg-background p-4 transition-colors hover:bg-accent/35 lg:grid-cols-[230px_1fr_220px] ${scenario.accent.border}`}
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${scenario.accent.bar}`} />
                <span className="flex min-w-0 gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${scenario.accent.icon}`}>
                    <scenario.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className={`mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded px-1.5 text-[11px] font-semibold ${scenario.accent.badge}`}>
                      {index + 1}
                    </span>
                    <span className="block text-sm font-semibold leading-5">{scenario.title}</span>
                    <span className="mt-1 block text-xs font-medium text-muted-foreground">{scenario.role}</span>
                  </span>
                </span>
                <span className="grid min-w-0 gap-2 sm:grid-cols-3">
                  {scenario.stages.map((stage) => (
                    <span key={stage.title} className={`rounded-md border p-3 ${scenario.accent.border} ${scenario.accent.panel}`}>
                      <span className="flex items-center gap-2 text-xs font-semibold">
                        <stage.icon className={`h-3.5 w-3.5 ${scenario.accent.text}`} />
                        {stage.title}
                      </span>
                      <span className="mt-1 block text-xs leading-4 text-muted-foreground">{stage.detail}</span>
                    </span>
                  ))}
                </span>
                <span className="flex items-center justify-between gap-3 lg:flex-col lg:items-end">
                  <span className="max-w-[220px] lg:text-right">
                    <span className={`block text-xs font-semibold ${scenario.accent.text}`}>
                      {scenario.outcome}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {scenario.detail}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase text-primary">Platform Pillars</p>
              <h2 className="text-xl font-semibold">What the workspace organizes</h2>
            </div>
            <div className="space-y-4">
              {platformPillars.map((pillar) => (
                <div key={pillar.title} className={`flex gap-3 rounded-md border p-3 ${pillar.accent.border} ${pillar.accent.panel}`}>
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${pillar.accent.icon}`}>
                    <pillar.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{pillar.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{pillar.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200/75 bg-emerald-50/70 p-5 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/10 sm:p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-200">
                Outcomes That Matter
              </p>
              <h2 className="text-xl font-semibold">Visible business value</h2>
            </div>
            <div className="space-y-3">
              {outcomes.map((outcome) => (
                <div key={outcome} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-success text-white">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-medium leading-5">{outcome}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
