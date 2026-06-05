'use client';

import Link from 'next/link';
import {
  AlertCircle,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  Boxes,
  BrainCircuit,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  DatabaseZap,
  ExternalLink,
  FileSearch,
  Filter,
  Info,
  Layers3,
  Loader2,
  Mail,
  Megaphone,
  PenSquare,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  UsersRound,
  WandSparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/page-header';

const accents = [
  {
    name: 'Source blue',
    token: 'Discover / source sync',
    icon: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
    panel: 'bg-blue-50/70 dark:bg-blue-500/10',
    border: 'border-blue-200/75 dark:border-blue-400/20',
    text: 'text-blue-700 dark:text-blue-200',
    bar: 'bg-blue-500',
    badge: 'bg-blue-600 text-white dark:bg-blue-400 dark:text-blue-950',
  },
  {
    name: 'AI violet',
    token: 'Create / generate',
    icon: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
    panel: 'bg-violet-50/70 dark:bg-violet-500/10',
    border: 'border-violet-200/75 dark:border-violet-400/20',
    text: 'text-violet-700 dark:text-violet-200',
    bar: 'bg-violet-500',
    badge: 'bg-violet-600 text-white dark:bg-violet-400 dark:text-violet-950',
  },
  {
    name: 'Review cyan',
    token: 'Compliance / QA',
    icon: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200',
    panel: 'bg-cyan-50/70 dark:bg-cyan-500/10',
    border: 'border-cyan-200/75 dark:border-cyan-400/20',
    text: 'text-cyan-700 dark:text-cyan-200',
    bar: 'bg-cyan-500',
    badge: 'bg-cyan-600 text-white dark:bg-cyan-400 dark:text-cyan-950',
  },
  {
    name: 'Outcome green',
    token: 'Approved / reusable',
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
    panel: 'bg-emerald-50/70 dark:bg-emerald-500/10',
    border: 'border-emerald-200/75 dark:border-emerald-400/20',
    text: 'text-emerald-700 dark:text-emerald-200',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-emerald-950',
  },
  {
    name: 'Insight sky',
    token: 'Measure / optimize',
    icon: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200',
    panel: 'bg-sky-50/70 dark:bg-sky-500/10',
    border: 'border-sky-200/75 dark:border-sky-400/20',
    text: 'text-sky-700 dark:text-sky-200',
    bar: 'bg-sky-500',
    badge: 'bg-sky-600 text-white dark:bg-sky-400 dark:text-sky-950',
  },
];

const journeySteps = [
  {
    title: 'Discover',
    detail: 'Source inventory, advisor topics, and campaign opportunities.',
    icon: DatabaseZap,
    accent: accents[0],
  },
  {
    title: 'Create',
    detail: 'AI-assisted drafts and channel-specific variations.',
    icon: Sparkles,
    accent: accents[1],
  },
  {
    title: 'Review',
    detail: 'Tone, claims posture, source context, and compliance signals.',
    icon: ShieldCheck,
    accent: accents[2],
  },
  {
    title: 'Publish',
    detail: 'Approved assets saved for reuse across advisor workflows.',
    icon: Send,
    accent: accents[3],
  },
  {
    title: 'Measure',
    detail: 'Output mix, readiness, and next best content priorities.',
    icon: TrendingUp,
    accent: accents[4],
  },
];

const scenarios = [
  {
    title: 'Create and distribute omnichannel content',
    role: 'Advisor',
    outcome: 'More coordinated advisor touchpoints',
    icon: Megaphone,
    accent: accents[0],
    stages: [
      { title: 'Source article', detail: 'Approved article selected', icon: DatabaseZap },
      { title: 'Generate kit', detail: 'Formats drafted', icon: Sparkles },
      { title: 'Save outputs', detail: 'Campaign ready', icon: Layers3 },
    ],
  },
  {
    title: 'Automated campaigns that nurture',
    role: 'Marketing manager',
    outcome: 'Follow-up becomes repeatable',
    icon: CalendarCheck,
    accent: accents[1],
    stages: [
      { title: 'Goal', detail: 'Audience set', icon: PenSquare },
      { title: 'Email copy', detail: 'Sequence drafted', icon: Mail },
      { title: 'Package', detail: 'Reusable set', icon: Send },
    ],
  },
  {
    title: 'Centralized compliance that scales',
    role: 'Compliance officer',
    outcome: 'Review context stays centralized',
    icon: ShieldCheck,
    accent: accents[2],
    stages: [
      { title: 'Scan', detail: 'Risk signals found', icon: FileSearch },
      { title: 'Context', detail: 'Sources visible', icon: BadgeCheck },
      { title: 'Approve', detail: 'Library record', icon: CheckCircle2 },
    ],
  },
  {
    title: 'Discoverability that converts',
    role: 'Editorial team',
    outcome: 'Advisor content is easier to find',
    icon: UsersRound,
    accent: accents[3],
    stages: [
      { title: 'Find themes', detail: 'Topics grouped', icon: BookOpenCheck },
      { title: 'Draft', detail: 'Long-form copy', icon: PenSquare },
      { title: 'Ready', detail: 'Review path clear', icon: Send },
    ],
  },
  {
    title: 'Smarter leads, stronger relationships',
    role: 'Marketing leader',
    outcome: 'Next priorities are clearer',
    icon: BrainCircuit,
    accent: accents[4],
    stages: [
      { title: 'Saved profile', detail: 'Assets organized', icon: Boxes },
      { title: 'Signals', detail: 'Mix and freshness', icon: BarChart3 },
      { title: 'Next action', detail: 'Priority visible', icon: TrendingUp },
    ],
  },
];

const pillars = [
  {
    title: 'AI-powered content',
    detail: 'Generation surfaces use violet and sparkle/brain icons.',
    icon: BrainCircuit,
    accent: accents[1],
  },
  {
    title: 'Omnichannel execution',
    detail: 'Distribution and format packaging use blue channel cues.',
    icon: Boxes,
    accent: accents[0],
  },
  {
    title: 'Unified compliance',
    detail: 'Review, source traceability, and audit states use cyan.',
    icon: ShieldCheck,
    accent: accents[2],
  },
  {
    title: 'Performance insight',
    detail: 'Metrics and dashboard analytics use sky blue.',
    icon: BarChart3,
    accent: accents[4],
  },
];

const outcomeExamples = [
  'Increase advisor discoverability',
  'Create more campaign assets',
  'Review content more consistently',
  'Reuse approved work across channels',
  'Show visible marketing momentum',
];

const typeSamples = [
  {
    label: 'Page title',
    className: 'text-3xl font-semibold tracking-normal text-foreground',
    text: 'Advisor Campaign Builder',
  },
  {
    label: 'Section title',
    className: 'text-xl font-semibold tracking-normal text-foreground',
    text: 'Review-ready content package',
  },
  {
    label: 'Card title',
    className: 'text-sm font-semibold leading-5 text-foreground',
    text: 'Monthly market update',
  },
  {
    label: 'Body copy',
    className: 'text-sm leading-6 text-muted-foreground',
    text: 'Use direct, work-focused language that helps the team scan state and choose the next action.',
  },
  {
    label: 'Helper copy',
    className: 'text-xs leading-5 text-muted-foreground',
    text: 'Visible in compact forms, empty states, row metadata, and input hints.',
  },
];

const labelSamples = [
  { label: 'Required field', value: 'Audience segment', tone: 'text-foreground' },
  { label: 'Optional field', value: 'Campaign note', tone: 'text-muted-foreground' },
  { label: 'Inline metadata', value: 'Last synced 4 min ago', tone: 'text-sky-700 dark:text-sky-200' },
  { label: 'Warning label', value: 'Needs source review', tone: 'text-amber-700 dark:text-amber-200' },
];

const statusSamples = [
  { label: 'Ready', icon: CheckCircle2, className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200' },
  { label: 'Draft', icon: PenSquare, className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200' },
  { label: 'Generating', icon: Loader2, className: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200' },
  { label: 'Review', icon: ClipboardCheck, className: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-200' },
  { label: 'Attention', icon: AlertCircle, className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200' },
];

export default function TemplateDesignSystem() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Template alignment reference"
        title="Template Design System"
        description="A review board for the color, workflow, scenario, pillar, and outcome examples identified from the shared template image."
        actions={(
          <>
            <Button asChild className="bg-white text-[#12306a] hover:bg-blue-50">
              <Link href="/">Compare Dashboard</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Link href="/product-lab?tab=knowledge-base">Open Knowledge Center</Link>
            </Button>
          </>
        )}
        metrics={accents.slice(0, 4).map((accent) => ({
          label: accent.name,
          detail: accent.token,
          icon: Sparkles,
          iconClassName: accent.icon,
        }))}
      />

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Color System</p>
            <h3 className="text-xl font-semibold">Workflow-coded accents</h3>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Use these accents consistently so the UI reads as a workflow board instead of neutral cards.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {accents.map((accent) => (
            <div key={accent.name} className={`overflow-hidden rounded-md border ${accent.border} ${accent.panel}`}>
              <div className={`h-1.5 ${accent.bar}`} />
              <div className="p-4">
                <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${accent.icon}`}>
                  <Sparkles className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold">{accent.name}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{accent.token}</p>
                <span className={`mt-3 inline-flex rounded px-2 py-1 text-[11px] font-semibold ${accent.badge}`}>
                  Status badge
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase text-primary">Core Elements</p>
            <h3 className="text-xl font-semibold">Typography, buttons, and labels</h3>
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-4">
              {typeSamples.map((sample) => (
                <div key={sample.label} className="rounded-md border border-border bg-background p-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">{sample.label}</p>
                  <p className={sample.className}>{sample.text}</p>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-background p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase text-muted-foreground">Button styles</p>
                <div className="grid gap-2">
                  <Button type="button" className="justify-start">
                    <WandSparkles className="h-4 w-4" />
                    Generate Kit
                  </Button>
                  <Button type="button" variant="secondary" className="justify-start">
                    <Save className="h-4 w-4" />
                    Save Draft
                  </Button>
                  <Button type="button" variant="outline" className="justify-start">
                    <Upload className="h-4 w-4" />
                    Upload Source
                  </Button>
                  <Button type="button" variant="ghost" className="justify-start">
                    <ExternalLink className="h-4 w-4" />
                    View Record
                  </Button>
                  <Button type="button" disabled className="justify-start">
                    <Loader2 className="h-4 w-4" />
                    Syncing
                  </Button>
                </div>
              </div>
              <div className="rounded-md border border-border bg-background p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase text-muted-foreground">Label examples</p>
                <div className="space-y-3">
                  {labelSamples.map((sample) => (
                    <div key={sample.value} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">{sample.label}</span>
                      <span className={`text-xs font-semibold ${sample.tone}`}>{sample.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase text-primary">Status Language</p>
            <h3 className="text-xl font-semibold">Badges and state chips</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Primary</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Blocked</Badge>
          </div>
          <div className="mt-5 grid gap-3">
            {statusSamples.map((status) => (
              <div key={status.label} className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${status.className}`}>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <status.icon className={`h-4 w-4 ${status.label === 'Generating' ? 'animate-spin' : ''}`} />
                  {status.label}
                </span>
                <span className="text-xs font-medium">State chip</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase text-primary">Form Patterns</p>
            <h3 className="text-xl font-semibold">Inputs and controls</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="template-search">Search label</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="template-search" value="Tax planning article" readOnly className="pl-9" />
              </div>
              <p className="text-xs leading-5 text-muted-foreground">Use helper text to explain source, timing, or constraints.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="template-error" className="text-destructive">Error label</Label>
              <Input id="template-error" value="Missing approved source" readOnly aria-invalid />
              <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                Select at least one source before generating.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-background p-3">
              <div>
                <Label htmlFor="approval-switch">Require review</Label>
                <p className="mt-1 text-xs text-muted-foreground">Show compliance steps in output rows.</p>
              </div>
              <Switch id="approval-switch" defaultChecked />
            </div>
            <label className="flex items-start gap-3 rounded-md border border-border bg-background p-3">
              <Checkbox defaultChecked className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium">Include reusable campaign assets</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">Checkboxes should support dense, scan-friendly choices.</span>
              </span>
            </label>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Navigation And Surfaces</p>
              <h3 className="text-xl font-semibold">Tabs, cards, filters, and rows</h3>
            </div>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="assets">Assets</TabsTrigger>
                <TabsTrigger value="review">Review</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background p-3">
                <Button type="button" variant="outline" size="sm">
                  <Filter className="h-4 w-4" />
                  Format
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="sm">
                  <Settings2 className="h-4 w-4" />
                  Audience
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Badge variant="secondary">3 selected</Badge>
              </div>
              {scenarios.slice(0, 3).map((scenario) => (
                <div key={scenario.title} className={`grid gap-3 rounded-md border bg-background p-4 md:grid-cols-[1fr_auto] ${scenario.accent.border}`}>
                  <div className="flex min-w-0 gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${scenario.accent.icon}`}>
                      <scenario.icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{scenario.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{scenario.role} · {scenario.outcome}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <Badge variant="outline" className={scenario.accent.text}>Template row</Badge>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Open ${scenario.title}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-border bg-background p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">Content card</span>
                <Badge className="bg-emerald-600 text-white dark:bg-emerald-400 dark:text-emerald-950">Ready</Badge>
              </div>
              <div className="rounded-md border border-blue-200/75 bg-blue-50/70 p-4 dark:border-blue-400/20 dark:bg-blue-500/10">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                    <Info className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Source-backed summary</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Cards should pair a clear title, state, metadata, and one next action.</p>
                  </div>
                </div>
                <Button type="button" size="sm" className="mt-4 w-full">
                  <Send className="h-4 w-4" />
                  Send to Review
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase text-primary">Journey Pattern</p>
          <h3 className="text-xl font-semibold">Template-style operating journey</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {journeySteps.map((step, index) => (
            <div key={step.title} className={`relative overflow-hidden rounded-md border p-4 ${step.accent.border} ${step.accent.panel}`}>
              <div className={`absolute inset-x-0 top-0 h-1 ${step.accent.bar}`} />
              <div className="mb-4 flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-md ${step.accent.icon}`}>
                  <step.icon className="h-4 w-4" />
                </span>
                <span className={`text-xs font-semibold ${step.accent.text}`}>0{index + 1}</span>
              </div>
              <h4 className="text-sm font-semibold">{step.title}</h4>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase text-primary">Scenario Rows</p>
            <h3 className="text-xl font-semibold">Advisor growth journey examples</h3>
          </div>
          <div className="grid gap-3">
            {scenarios.map((scenario, index) => (
              <div
                key={scenario.title}
                className={`relative grid gap-4 overflow-hidden rounded-md border bg-background p-4 lg:grid-cols-[230px_1fr_220px] ${scenario.accent.border}`}
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${scenario.accent.bar}`} />
                <div className="flex min-w-0 gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${scenario.accent.icon}`}>
                    <scenario.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <span className={`mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded px-1.5 text-[11px] font-semibold ${scenario.accent.badge}`}>
                      {index + 1}
                    </span>
                    <p className="text-sm font-semibold leading-5">{scenario.title}</p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">{scenario.role}</p>
                  </div>
                </div>
                <div className="grid min-w-0 gap-2 sm:grid-cols-3">
                  {scenario.stages.map((stage) => (
                    <div key={stage.title} className={`rounded-md border p-3 ${scenario.accent.border} ${scenario.accent.panel}`}>
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <stage.icon className={`h-3.5 w-3.5 ${scenario.accent.text}`} />
                        {stage.title}
                      </div>
                      <p className="mt-1 text-xs leading-4 text-muted-foreground">{stage.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end">
                  <div className="max-w-[220px] lg:text-right">
                    <p className={`text-xs font-semibold ${scenario.accent.text}`}>{scenario.outcome}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      This is the outcome-oriented right column from the template pattern.
                    </p>
                  </div>
                  <Send className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase text-primary">Platform Pillars</p>
              <h3 className="text-xl font-semibold">Right rail examples</h3>
            </div>
            <div className="space-y-4">
              {pillars.map((pillar) => (
                <div key={pillar.title} className={`flex gap-3 rounded-md border p-3 ${pillar.accent.border} ${pillar.accent.panel}`}>
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${pillar.accent.icon}`}>
                    <pillar.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold">{pillar.title}</h4>
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
              <h3 className="text-xl font-semibold">Business value rail</h3>
            </div>
            <div className="space-y-3">
              {outcomeExamples.map((outcome) => (
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
