'use client';

import { useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  DatabaseZap,
  Eye,
  GitCommit,
  Images,
  Layers3,
  PanelTop,
  Rocket,
  ScrollText,
  Smartphone,
  Sparkles,
  Tags,
  WandSparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ProductUpdateTab = 'change-log' | 'visual-log';

const changelogGroups = [
  {
    period: 'Week of May 27, 2026',
    theme: 'Instagram carousel preview and generation polish',
    commits: ['355b2cc', 'a1d0eac', '77733ad', '1ab20dd'],
    icon: Smartphone,
    items: [
      'Added an AI-generated visual backdrop for the Instagram Preview phone mockup, using the first carousel masterplate as reference.',
      'Renamed Swipe to Instagram Preview, made it the default carousel output view, and added clear view icons.',
      'Centered the Instagram carousel swipe preview so adjacent slides no longer bleed into the active slide.',
      'Added larger bouncing-dot progress states directly inside generated output areas.',
    ],
  },
  {
    period: 'Week of May 27, 2026',
    theme: 'Editorial metadata and source exploration',
    commits: ['968203c', '873b96a'],
    icon: Tags,
    items: [
      'Added Settings -> Tag Explorer with tag counts, top tags, cleanup views, case-variant detection, and Source Content links.',
      'Centralized content designation and tag color mapping so labels stay visually consistent across Source Content, modals, and generation screens.',
    ],
  },
  {
    period: 'Week of May 27, 2026',
    theme: 'Metrics and dashboard positioning',
    commits: ['56a7e87', '9619395', '3c003c3'],
    icon: DatabaseZap,
    items: [
      'Moved Generated Assets to durable Supabase-backed generation events and added separate generated image tracking.',
      'Refocused the dashboard around internal Editorial Team workflows rather than external marketing/advisor language.',
      'Aligned the dashboard with the workflow design template patterns.',
    ],
  },
  {
    period: 'Week of May 27, 2026',
    theme: 'Settings knowledge and design reference',
    commits: ['c763ba3', 'd803ae2', '049a5ff', 'bf1e72e', 'ec15509', '78c6e05'],
    icon: PanelTop,
    items: [
      'Added the Template Design System page for reviewing workflow colors, patterns, rows, and examples.',
      'Built the Knowledge Center foundation, expanded workflow playbooks, and added a help-only support chat widget.',
      'Turned Settings into the home for operational, help, and review tools.',
    ],
  },
  {
    period: 'Earlier foundation',
    theme: 'Source detail, EchoWrite, and scan improvements',
    commits: ['719a4c6', 'f24d947', '32fdb0d', 'bdd1c82', 'e30d862', 'c78c2c4'],
    icon: Layers3,
    items: [
      'Improved source detail rendering for structured rich content and XML-like provider bodies.',
      'Stored richer source content bodies for better preview and generation context.',
      'Improved Content Scan search and EchoWrite source grounding, citations, and generation states.',
    ],
  },
];

const visualMoments = [
  {
    title: 'Editorial command center',
    kicker: 'Dashboard',
    icon: Rocket,
    summary: 'The app shifted toward an internal editorial workspace for source discovery, generation, review, and reuse.',
    accent: 'from-blue-500 via-cyan-400 to-emerald-300',
  },
  {
    title: 'Generation that shows its work',
    kicker: 'Generate Content',
    icon: Sparkles,
    summary: 'Progress now lives in the output surface and generation counts persist over time in Supabase.',
    accent: 'from-violet-500 via-fuchsia-400 to-sky-300',
  },
  {
    title: 'Instagram preview becomes a stage',
    kicker: 'Carousel',
    icon: Smartphone,
    summary: 'The carousel output now opens into an Instagram-style phone view with a generated visual backdrop.',
    accent: 'from-slate-950 via-indigo-600 to-cyan-400',
  },
  {
    title: 'Metadata becomes navigable',
    kicker: 'Tags',
    icon: Tags,
    summary: 'Tags and designations now have consistent color, usage metrics, cleanup cues, and source-content links.',
    accent: 'from-teal-500 via-sky-400 to-indigo-400',
  },
];

export default function ProductUpdates() {
  const [activeTab, setActiveTab] = useState<ProductUpdateTab>('change-log');

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-[linear-gradient(135deg,#11285a_0%,#143a7b_58%,#0f6f8f_100%)] p-6 text-white sm:p-7">
            <Badge className="mb-4 border-white/20 bg-white/10 text-white hover:bg-white/10">
              Product Updates
            </Badge>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight">What changed in Editorial</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50/85">
              A readable changelog plus an experimental visual release story for the product work we are shipping.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => setActiveTab('change-log')}
                className={cn(
                  'bg-white text-[#12306a] hover:bg-blue-50',
                  activeTab !== 'change-log' && 'border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white'
                )}
                variant={activeTab === 'change-log' ? 'default' : 'outline'}
              >
                <ScrollText className="h-4 w-4" />
                Change Log
              </Button>
              <Button
                type="button"
                onClick={() => setActiveTab('visual-log')}
                className={cn(
                  'border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white',
                  activeTab === 'visual-log' && 'bg-white text-[#12306a] hover:bg-blue-50'
                )}
                variant={activeTab === 'visual-log' ? 'default' : 'outline'}
              >
                <Eye className="h-4 w-4" />
                Visual Log
              </Button>
            </div>
          </div>
          <div className="grid content-center gap-3 bg-secondary/60 p-6 sm:p-7">
            <UpdateStat icon={GitCommit} value="30" label="recent commits reviewed" />
            <UpdateStat icon={BadgeCheck} value="5" label="release groups" />
            <UpdateStat icon={CalendarDays} value="Weekly" label="current summary cadence" />
          </div>
        </div>
      </section>

      {activeTab === 'change-log' ? <ChangeLog /> : <VisualLog />}
    </div>
  );
}

function ChangeLog() {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Change Log</p>
          <h3 className="text-xl font-semibold">Recent product milestones</h3>
        </div>
        <div className="text-xs text-muted-foreground">Generated from recent repo commit history and grouped for readability.</div>
      </div>

      <div className="space-y-4">
        {changelogGroups.map((group) => {
          const Icon = group.icon;
          return (
            <article key={group.theme} className="rounded-md border border-border bg-background p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">{group.period}</div>
                    <h4 className="mt-1 text-base font-semibold">{group.theme}</h4>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.commits.map((commit) => (
                    <Badge key={commit} variant="outline" className="font-mono text-[11px]">
                      {commit}
                    </Badge>
                  ))}
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function VisualLog() {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-slate-950 text-white shadow-sm">
      <div className="relative min-h-[620px] overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.38),transparent_32%),radial-gradient(circle_at_80%_22%,rgba(168,85,247,0.3),transparent_30%),linear-gradient(180deg,#08111f_0%,#0f172a_45%,#020617_100%)]" />
        <div className="absolute left-1/2 top-0 h-[900px] w-[900px] -translate-x-1/2 rounded-full border border-white/10 opacity-50" />
        <div className="absolute -right-32 top-40 h-72 w-72 rounded-full border border-cyan-300/20" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="sticky top-4 z-20 mb-8 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/75 backdrop-blur">
            Visual Log - experimental product update story
          </div>

          <div className="grid min-h-[520px] items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Badge className="mb-4 border-white/20 bg-white/10 text-white hover:bg-white/10">
                Scaffold v1
              </Badge>
              <h3 className="max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
                A release page that feels more like a product story.
              </h3>
              <p className="mt-5 max-w-xl text-sm leading-6 text-white/70">
                This first pass sets up the motion vocabulary: sticky framing, layered panels, depth,
                visual cards, and scroll-ready sections inspired by modern product update pages.
              </p>
            </div>

            <div className="relative min-h-[420px] [perspective:1200px]">
              <div className="absolute left-8 top-0 h-72 w-56 rotate-[-10deg] rounded-3xl border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-xl [transform-style:preserve-3d]">
                <div className="h-full rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-400 to-emerald-300 p-4">
                  <DatabaseZap className="h-8 w-8 text-white" />
                  <div className="mt-24 text-xl font-semibold">Source intelligence</div>
                </div>
              </div>
              <div className="absolute left-28 top-20 h-80 w-60 rotate-[4deg] rounded-3xl border border-white/20 bg-white/15 p-3 shadow-2xl backdrop-blur-xl">
                <div className="h-full rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-sky-400 p-4">
                  <WandSparkles className="h-8 w-8 text-white" />
                  <div className="mt-32 text-xl font-semibold">Generation flow</div>
                </div>
              </div>
              <div className="absolute right-4 top-52 h-60 w-52 rotate-[12deg] rounded-3xl border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-xl">
                <div className="h-full rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-600 to-cyan-400 p-4">
                  <Images className="h-8 w-8 text-white" />
                  <div className="mt-20 text-lg font-semibold">Visual preview</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-8 pb-10">
            {visualMoments.map((moment, index) => {
              const Icon = moment.icon;
              return (
                <article
                  key={moment.title}
                  className="sticky rounded-3xl border border-white/15 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-xl"
                  style={{ top: `${72 + index * 18}px` }}
                >
                  <div className="grid gap-5 md:grid-cols-[220px_1fr] md:items-center">
                    <div className={`min-h-40 rounded-2xl bg-gradient-to-br ${moment.accent} p-5`}>
                      <Icon className="h-8 w-8" />
                      <div className="mt-16 text-sm font-semibold uppercase tracking-wide text-white/75">{moment.kicker}</div>
                    </div>
                    <div>
                      <div className="text-sm text-cyan-200">0{index + 1}</div>
                      <h4 className="mt-1 text-2xl font-semibold">{moment.title}</h4>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68">{moment.summary}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function UpdateStat({ icon: Icon, value, label }: { icon: typeof GitCommit; value: string; label: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-lg font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
