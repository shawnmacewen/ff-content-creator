'use client';

import {
  Bot,
  Braces,
  Compass,
  FileCode2,
  Layers3,
  Lightbulb,
  ScrollText,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type PhilosophyCard = {
  title: string;
  kicker: string;
  icon: LucideIcon;
  accent: string;
  body: string;
};

const agentDocuments = [
  {
    name: 'AGENTS.md',
    label: 'Project Agent Spec',
    excerpt: 'A project-level agent file gives future contributors the operating rules for the built-in coding partner: inspect before changing, follow local patterns, keep work reviewable, validate when possible, and report changes clearly.',
  },
];

const philosophyCards: PhilosophyCard[] = [
  {
    title: 'Agent as product collaborator',
    kicker: 'What comes with the project',
    icon: Bot,
    accent: 'from-sky-500 via-cyan-300 to-emerald-300',
    body: 'The agent is part of the project handoff, not a separate mystery tool. Its instructions, habits, and working assumptions should travel with the code so another builder can continue with the same context.',
  },
  {
    title: 'Editorial is an operating system',
    kicker: 'The other side of the coin',
    icon: Layers3,
    accent: 'from-violet-500 via-fuchsia-400 to-rose-300',
    body: 'Platform architecture explains how the product works. Agent philosophy explains how the project is worked on. Together they make the system easier to understand, extend, and recover later.',
  },
  {
    title: 'Human review stays central',
    kicker: 'Why tools show their work',
    icon: ShieldCheck,
    accent: 'from-amber-400 via-orange-300 to-red-300',
    body: 'Tools should expose citations, prompts, source details, readiness checks, match scores, and caveats so the Editorial team can judge output instead of blindly accepting it.',
  },
];

const platformPillars = [
  'Find and understand source content quickly.',
  'Transform trusted source material into useful editorial assets.',
  'Make generated output reviewable, editable, and attributable.',
  'Support specialized workflows like CE courses and Canadian adaptations.',
  'Keep downstream delivery flexible through stable package, export, and API shapes.',
];

const changeLevers = [
  {
    title: 'Tone',
    detail: 'Change whether the agent writes terse engineering notes, product strategy language, or more editorial explanation.',
    icon: WandSparkles,
  },
  {
    title: 'Risk posture',
    detail: 'Tune how conservative the agent should be around schema changes, generation prompts, validation, and deployment assumptions.',
    icon: ShieldCheck,
  },
  {
    title: 'Product taste',
    detail: 'Guide layouts, visual density, naming, UX patterns, and how playful experiments should feel inside Product Lab.',
    icon: Lightbulb,
  },
  {
    title: 'Workflow priorities',
    detail: 'Tell the agent which user journeys matter most so implementation choices follow the team’s real content work.',
    icon: Compass,
  },
];

export default function PhilosophyLab() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-border bg-slate-950 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.35),transparent_32%),radial-gradient(circle_at_82%_24%,rgba(244,114,182,0.28),transparent_30%),linear-gradient(135deg,rgba(15,23,42,1),rgba(15,23,42,0.9))]" />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[1fr_360px] lg:p-8">
          <div className="max-w-3xl">
            <Badge className="bg-white/12 text-white hover:bg-white/18">Product Lab sketch</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Agent Philosophy</h1>
            <p className="mt-4 text-sm leading-7 text-white/72 md:text-base">
              An AI agent is a software collaborator with instructions, tools, project context, and a working style. For Editorial, the point is to make that collaborator visible inside the project instead of leaving it as hidden chat history.
            </p>
            <p className="mt-3 text-sm leading-7 text-white/72 md:text-base">
              The project should carry its own agent specifications, design documents, change logs, and platform notes so a future contributor can understand both the app and the way the app has been built.
            </p>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-300 text-slate-950">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-semibold">Current operating idea</div>
                <div className="text-xs text-white/60">A project-aware agent built into Editorial</div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs leading-5 text-white/72">
              <p>Understand the design intent.</p>
              <p>Follow the project's existing patterns.</p>
              <p>Keep changes small and traceable.</p>
              <p>Leave useful handoff notes for the next contributor.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {philosophyCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <div className={cn('h-2 bg-gradient-to-r', card.accent)} />
              <div className="p-5">
                <span className={cn('flex h-11 w-11 items-center justify-center rounded-md bg-gradient-to-br text-slate-950', card.accent)}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-xs font-semibold uppercase text-primary">{card.kicker}</p>
                <h2 className="mt-1 text-lg font-semibold">{card.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.body}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ScrollText className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Platform Philosophy</p>
              <h2 className="text-xl font-semibold">What we are building</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Editorial is an internal content workspace for teams that manage advisor-facing material. Platform architecture is the product side of the same philosophy: source content, generation workflows, review surfaces, packaging, and delivery paths should be clear enough for both humans and agents to work with.
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {platformPillars.map((pillar, index) => (
              <div key={pillar} className="flex gap-3 rounded-md border border-border bg-muted/20 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-muted-foreground">{pillar}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
              <FileCode2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Agent docs</p>
              <h2 className="text-lg font-semibold">Project-local instructions in plain language</h2>
            </div>
          </div>
          <p className="mb-4 text-sm leading-6 text-muted-foreground">
            The agent file is a practical project asset. It teaches future contributors how the coding partner should read the repo, respect the design documents, use the change history, and make decisions that fit Editorial.
          </p>
          <div className="space-y-3">
            {agentDocuments.map((doc) => (
              <div key={doc.name} className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-xs font-semibold">{doc.name}</div>
                  <Badge variant="outline">{doc.label}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{doc.excerpt}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Braces className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Agent philosophy scope</p>
            <h2 className="text-lg font-semibold">What the project agent specification shapes</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {changeLevers.map((lever) => {
            const Icon = lever.icon;
            return (
              <div key={lever.title} className="rounded-md border border-border bg-muted/20 p-4">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold">{lever.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{lever.detail}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
