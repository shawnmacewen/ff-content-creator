'use client';

import { useState, type CSSProperties } from 'react';
import {
  BadgeCheck,
  BarChart3,
  Captions,
  Clock3,
  Flag,
  GalleryHorizontalEnd,
  Gauge,
  Layers3,
  Mic2,
  Palette,
  PauseCircle,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type RoadmapView = 'lanes' | 'matrix';
type RoadmapStatus = 'Now' | 'Next' | 'Later';

type RoadmapIdea = {
  title: string;
  status: RoadmapStatus;
  theme: string;
  summary: string;
  details: string[];
  promptData?: string[];
  icon: LucideIcon;
  impact: number;
  effort: number;
  matrix: { x: number; y: number };
  accent: string;
};

const roadmapIdeas: RoadmapIdea[] = [
  {
    title: 'Carousel Output Styles',
    status: 'Now',
    theme: 'Instagram Carousel',
    summary: 'Add more visual output styles so carousel generation has more variety across campaigns.',
    details: [
      'Add a larger style menu for layout, mood, density, typography, and slide rhythm.',
      'Keep existing carousel review modes, but let the generation plan pick a stronger style direction before image creation.',
      'Include style matching so new carousels can borrow visual cues from a selected example, brand profile, or prior approved output.',
    ],
    icon: GalleryHorizontalEnd,
    impact: 9,
    effort: 6,
    matrix: { x: 63, y: 15 },
    accent: 'from-cyan-400 via-emerald-300 to-lime-300',
  },
  {
    title: 'Style Matching',
    status: 'Now',
    theme: 'Brand Consistency',
    summary: 'Make generated assets feel closer to approved brand examples instead of starting from a generic design prompt.',
    details: [
      'Let users pick a style reference from saved outputs, uploaded examples, or future Custom Profile assets.',
      'Extract reusable cues such as palette, type weight, composition, spacing, and image treatment.',
      'Show a short style summary before generation so reviewers can confirm the intended look.',
    ],
    icon: Palette,
    impact: 8,
    effort: 7,
    matrix: { x: 82, y: 31 },
    accent: 'from-amber-300 via-rose-300 to-fuchsia-300',
  },
  {
    title: 'Script Teleprompter',
    status: 'Next',
    theme: 'Video Script Output',
    summary: 'Turn video script outputs into a simple read-along teleprompter tool with practical presenter settings.',
    details: [
      'Add a teleprompter view for generated video scripts with large readable text, scrolling controls, and presenter-friendly spacing.',
      'Include basic controls for scroll speed, font size, line spacing, countdown, and mirror mode.',
      'Allow users to jump between hook, main points, compliance line, and CTA sections.',
    ],
    promptData: [
      'Target runtime and words-per-minute pacing.',
      'Pause markers for breaths, emphasis, transitions, and compliance disclosures.',
      'Segment timing for hook, setup, main points, example, CTA, and outro.',
      'Delivery notes such as slower phrasing, energetic opener, or calmer advisory tone.',
    ],
    icon: Mic2,
    impact: 8,
    effort: 5,
    matrix: { x: 37, y: 22 },
    accent: 'from-sky-300 via-indigo-300 to-violet-300',
  },
  {
    title: 'Prompt Pacing Data',
    status: 'Next',
    theme: 'Generation Prompting',
    summary: 'Improve video-script prompting so the model writes with timing, pauses, and delivery rhythm in mind.',
    details: [
      'Ask for pacing, estimated time, and pause instructions when Video Script output is selected.',
      'Store prompt metadata alongside the generated script so the teleprompter can use it later.',
      'Make output review show timing notes without crowding the script body.',
    ],
    promptData: [
      'Estimated runtime by section.',
      'Suggested pause lengths after key ideas.',
      'Emphasis cues for numbers, risks, and next steps.',
      'Optional short-form and long-form pacing variants.',
    ],
    icon: PauseCircle,
    impact: 7,
    effort: 4,
    matrix: { x: 20, y: 43 },
    accent: 'from-teal-300 via-cyan-300 to-blue-300',
  },
  {
    title: 'User Customizations',
    status: 'Next',
    theme: 'Platform and Content',
    summary: 'Let teams customize the platform wrapper and generation assets around their own brand system.',
    details: [
      'Add white-label platform naming, brand colors, logo uploads, and reusable asset controls.',
      'Support content overlays for logos, campaign marks, and approved visual treatments.',
      'Include optional disclaimer blocks that can be reused across generated content and review workflows.',
    ],
    icon: BadgeCheck,
    impact: 8,
    effort: 6,
    matrix: { x: 58, y: 38 },
    accent: 'from-lime-300 via-cyan-300 to-blue-300',
  },
  {
    title: 'Roadmap Views',
    status: 'Later',
    theme: 'Planning Workspace',
    summary: 'Keep the Roadmap Ideas page useful as the idea list grows into a lightweight product planning surface.',
    details: [
      'Keep Now, Next, Later as the fast planning view.',
      'Add an Impact/Effort board for prioritizing quick wins, bigger bets, and backlog items.',
      'Later, connect ideas to releases, product updates, and user feedback notes.',
    ],
    icon: BarChart3,
    impact: 6,
    effort: 4,
    matrix: { x: 33, y: 72 },
    accent: 'from-orange-300 via-amber-200 to-emerald-200',
  },
];

const lanes: RoadmapStatus[] = ['Now', 'Next', 'Later'];

export default function RoadmapIdeas() {
  const [view, setView] = useState<RoadmapView>('lanes');

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-lg border border-border bg-slate-950 p-5 text-white shadow-sm sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(circle at 12% 24%, rgba(45,212,191,.26), transparent 28%), radial-gradient(circle at 82% 18%, rgba(251,191,36,.24), transparent 24%), radial-gradient(circle at 72% 88%, rgba(244,114,182,.18), transparent 30%), linear-gradient(135deg,#07111f,#111827 54%,#020617)',
          }}
        />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">Roadmap Ideas</Badge>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">Experimental planning board</h2>
            <p className="mt-3 text-sm leading-6 text-white/72">
              A working space for upcoming Editorial ideas before they become scoped product work.
            </p>
          </div>
          <div className="grid gap-3 sm:min-w-[420px]">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={view === 'lanes' ? 'default' : 'outline'}
                className={cn(view !== 'lanes' && 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white')}
                onClick={() => setView('lanes')}
              >
                <Layers3 className="h-4 w-4" />
                Now Next Later
              </Button>
              <Button
                type="button"
                variant={view === 'matrix' ? 'default' : 'outline'}
                className={cn(view !== 'matrix' && 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white')}
                onClick={() => setView('matrix')}
              >
                <Gauge className="h-4 w-4" />
                Impact Effort
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <RoadmapStat icon={Sparkles} value="6" label="seed ideas" tone="dark" />
              <RoadmapStat icon={Flag} value="2" label="planning views" tone="dark" />
              <RoadmapStat icon={Clock3} value="Next" label="teleprompter pass" tone="dark" />
            </div>
          </div>
        </div>
      </div>

      {view === 'lanes' ? <RoadmapLanes /> : <ImpactEffortMatrix />}
    </section>
  );
}

function RoadmapLanes() {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {lanes.map((lane) => (
        <section key={lane} className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">{lane}</p>
              <h3 className="text-lg font-semibold">{lane === 'Now' ? 'Shape first' : lane === 'Next' ? 'Prototype next' : 'Keep visible'}</h3>
            </div>
            <Badge variant="outline">{roadmapIdeas.filter((idea) => idea.status === lane).length} ideas</Badge>
          </div>
          <div className="space-y-3">
            {roadmapIdeas
              .filter((idea) => idea.status === lane)
              .map((idea) => (
                <RoadmapIdeaCard key={idea.title} idea={idea} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RoadmapIdeaCard({ idea }: { idea: RoadmapIdea }) {
  const Icon = idea.icon;

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
      <div className={`h-1.5 bg-gradient-to-r ${idea.accent}`} />
      <div className="p-4">
        <div className="flex gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${idea.accent} text-slate-950`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase text-muted-foreground">{idea.theme}</div>
            <h4 className="mt-1 text-base font-semibold leading-tight">{idea.title}</h4>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{idea.summary}</p>
        <ul className="mt-3 space-y-2 text-sm leading-5 text-muted-foreground">
          {idea.details.map((detail) => (
            <li key={detail} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
        {idea.promptData ? (
          <div className="mt-4 rounded-md border border-border bg-muted/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-primary">
              <Captions className="h-3.5 w-3.5" />
              Prompt data to add
            </div>
            <div className="grid gap-2 text-xs leading-5 text-muted-foreground">
              {idea.promptData.map((item) => (
                <div key={item} className="flex gap-2">
                  <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ImpactEffortMatrix() {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Prioritization</p>
          <h3 className="text-xl font-semibold">Impact / Effort view</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A second common roadmap view for comparing quick wins, bigger bets, and backlog ideas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">High impact is higher</Badge>
          <Badge variant="outline">More effort is farther right</Badge>
        </div>
      </div>

      <div className="relative h-[600px] overflow-hidden rounded-lg border border-border bg-background p-4">
        <div className="absolute inset-4 grid grid-cols-2 grid-rows-2 overflow-hidden rounded-md border border-border">
          <MatrixQuadrant title="Quick wins" subtitle="High impact / lower effort" className="border-b border-r border-border bg-emerald-500/[0.05]" />
          <MatrixQuadrant title="Big bets" subtitle="High impact / higher effort" className="border-b border-border bg-primary/[0.04]" />
          <MatrixQuadrant title="Small polish" subtitle="Lower impact / lower effort" className="border-r border-border bg-amber-500/[0.05]" />
          <MatrixQuadrant title="Parking lot" subtitle="Lower impact / higher effort" className="bg-muted/25" />
        </div>

        <div className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Impact
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Effort
        </div>

        {roadmapIdeas.map((idea) => {
          const Icon = idea.icon;
          const style = {
            left: `${idea.matrix.x}%`,
            top: `${idea.matrix.y}%`,
          } satisfies CSSProperties;

          return (
            <article
              key={idea.title}
              className="absolute z-10 w-[min(232px,42vw)] -translate-x-1/2 rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur"
              style={style}
            >
              <div className="flex items-start gap-2">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${idea.accent} text-slate-950`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">{idea.status}</div>
                  <h4 className="text-sm font-semibold leading-tight">{idea.title}</h4>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <div className="rounded-md bg-muted px-2 py-1">
                  Impact <span className="font-semibold text-foreground">{idea.impact}/10</span>
                </div>
                <div className="rounded-md bg-muted px-2 py-1">
                  Effort <span className="font-semibold text-foreground">{idea.effort}/10</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MatrixQuadrant({ title, subtitle, className }: { title: string; subtitle: string; className?: string }) {
  return (
    <div className={cn('p-4', className)}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}

function RoadmapStat({
  icon: Icon,
  value,
  label,
  tone = 'light',
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  tone?: 'light' | 'dark';
}) {
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        tone === 'dark' ? 'border-white/15 bg-white/10 text-white' : 'border-border bg-background'
      )}
    >
      <div className={cn('mb-2 flex items-center gap-2 text-xs', tone === 'dark' ? 'text-white/65' : 'text-muted-foreground')}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-lg font-semibold leading-none">{value}</div>
    </div>
  );
}
