import type { ComponentType } from 'react';
import {
  DatabaseZap,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

type Icon = ComponentType<{ className?: string }>;

type Accent = {
  icon: string;
  panel: string;
  border: string;
  text: string;
  bar: string;
};

const accents: Accent[] = [
  {
    icon: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
    panel: 'bg-blue-50/70 dark:bg-blue-500/10',
    border: 'border-blue-200/75 dark:border-blue-400/20',
    text: 'text-blue-700 dark:text-blue-200',
    bar: 'bg-blue-500',
  },
  {
    icon: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
    panel: 'bg-violet-50/70 dark:bg-violet-500/10',
    border: 'border-violet-200/75 dark:border-violet-400/20',
    text: 'text-violet-700 dark:text-violet-200',
    bar: 'bg-violet-500',
  },
  {
    icon: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200',
    panel: 'bg-cyan-50/70 dark:bg-cyan-500/10',
    border: 'border-cyan-200/75 dark:border-cyan-400/20',
    text: 'text-cyan-700 dark:text-cyan-200',
    bar: 'bg-cyan-500',
  },
  {
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
    panel: 'bg-emerald-50/70 dark:bg-emerald-500/10',
    border: 'border-emerald-200/75 dark:border-emerald-400/20',
    text: 'text-emerald-700 dark:text-emerald-200',
    bar: 'bg-emerald-500',
  },
  {
    icon: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200',
    panel: 'bg-sky-50/70 dark:bg-sky-500/10',
    border: 'border-sky-200/75 dark:border-sky-400/20',
    text: 'text-sky-700 dark:text-sky-200',
    bar: 'bg-sky-500',
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

export default function OperatingJourney() {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Operating Journey</p>
          <h2 className="text-xl font-semibold">From source article to reusable editorial asset</h2>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Workflow-coded color, status, and outcome cues for the editorial operating model.
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
  );
}
