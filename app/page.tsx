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
  DatabaseZap,
  FileSearch,
  Layers3,
  Mail,
  MessageSquareText,
  PenSquare,
  Send,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mapGeneratedContentRows } from '@/lib/mappers/generated-content';
import type { GeneratedContent } from '@/lib/types/content';

type Icon = ComponentType<{ className?: string }>;

const journeySteps: { title: string; detail: string; icon: Icon }[] = [
  {
    title: 'Source',
    detail: 'Sync advisor-ready articles and campaign material.',
    icon: DatabaseZap,
  },
  {
    title: 'Generate',
    detail: 'Transform source material into channel-specific assets.',
    icon: Sparkles,
  },
  {
    title: 'Review',
    detail: 'Inspect tone, compliance posture, and campaign fit.',
    icon: BadgeCheck,
  },
  {
    title: 'Publish',
    detail: 'Move approved content into library and distribution flows.',
    icon: Send,
  },
];

const scenarioCards: { title: string; detail: string; href: string; icon: Icon }[] = [
  {
    title: 'Launch a multi-channel campaign',
    detail: 'Create social posts, emails, articles, and carousel assets from one source.',
    href: '/generate',
    icon: Layers3,
  },
  {
    title: 'Audit source coverage',
    detail: 'Search content themes and identify gaps before building new campaigns.',
    href: '/audit',
    icon: FileSearch,
  },
  {
    title: 'Draft long-form advisor copy',
    detail: 'Use EchoWrite for editorial drafting with source attribution in view.',
    href: '/echo-write',
    icon: PenSquare,
  },
];

const platformPillars: { title: string; detail: string; icon: Icon }[] = [
  {
    title: 'Content intelligence',
    detail: 'Synced source inventory, provider metadata, and searchable knowledge assets.',
    icon: BookOpenCheck,
  },
  {
    title: 'Generation workflows',
    detail: 'Configurable formats for social, email, newsletter, article, and carousel output.',
    icon: Boxes,
  },
  {
    title: 'Reusable library',
    detail: 'Generated content moves toward a durable, reviewable library of marketing assets.',
    icon: MessageSquareText,
  },
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
        detail: 'New campaign assets',
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
            <Badge className="mb-5 border-white/20 bg-white/10 text-white hover:bg-white/10">
              Advisor marketing command center
            </Badge>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
              Turn trusted source content into coordinated advisor campaigns.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-50/85 sm:text-base">
              Editorial brings synced source material, AI-assisted generation, review context,
              and reusable campaign assets into one operational workspace.
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
                {['Content sync ready', 'Generation routes online', 'Review library connected'].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-success/15">
                      <BadgeCheck className="h-4 w-4 text-success" />
                    </span>
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Campaign output mix</p>
                  <p className="text-xs text-muted-foreground">
                    Social, email, and editorial formats from one workflow.
                  </p>
                </div>
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {['Social', 'Email', 'Articles'].map((label, index) => (
                  <div key={label} className="rounded-md bg-muted p-3 text-center">
                    <div className="mx-auto mb-2 h-1.5 rounded-full bg-primary" style={{ width: `${85 - index * 16}%` }} />
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="rounded-lg border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-primary" />
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
            <h2 className="text-xl font-semibold">From source article to approved asset</h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            The dashboard now follows the same process-first language as the new design template.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {journeySteps.map((step, index) => (
            <div key={step.title} className="relative rounded-md border border-border bg-secondary/45 p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <step.icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  0{index + 1}
                </span>
              </div>
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Priority Workflows</p>
              <h2 className="text-xl font-semibold">Common advisor marketing scenarios</h2>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/generate">Open Generator</Link>
            </Button>
          </div>
          <div className="grid gap-3">
            {scenarioCards.map((scenario) => (
              <Link
                key={scenario.title}
                href={scenario.href}
                className="group flex items-center gap-4 rounded-md border border-border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-accent/45"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <scenario.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{scenario.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {scenario.detail}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase text-primary">Platform Pillars</p>
            <h2 className="text-xl font-semibold">What the workspace organizes</h2>
          </div>
          <div className="space-y-4">
            {platformPillars.map((pillar) => (
              <div key={pillar.title} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
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
      </section>
    </div>
  );
}
