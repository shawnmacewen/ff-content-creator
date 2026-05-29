'use client';

import { useState, type CSSProperties } from 'react';
import {
  BadgeCheck,
  BarChart3,
  Captions,
  Clock3,
  FileText,
  Flag,
  GalleryHorizontalEnd,
  Gauge,
  ImagePlus,
  Layers3,
  Mic2,
  PauseCircle,
  Printer,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
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
  prd?: {
    title: string;
    description: string;
    content: string;
  };
  joke?: string;
  icon: LucideIcon;
  impact: number;
  effort: number;
  matrix: { x: number; y: number };
  accent: string;
};

const ceCourseCreationPrd = `# PRD: CE Course Creation

## Overview

CE Course Creation helps the Editorial team build continuing education course packages from existing Broadridge Forefield source content. The first version focuses on creating a complete quiz-based CE package from selected articles, saving that package to the database, and making it retrievable for downstream systems. Sora video generation is a later enhancement.

## Primary User

The primary user is the Editorial team. They use the tool to create CE course packages, review the generated quiz material, and prepare courses for submission to governing bodies or downstream delivery systems.

## Problem

Today, CE course creation requires the team to gather related Forefield articles, read the material, create a quiz, prepare answer keys, and package the course for another system. The reading set may include one article or several related articles. Learners typically read a small bundle of articles and then answer a quiz sized to the amount of reading.

## Goals

- Let an Editorial user select 1 to 5 existing source content items.
- Help users find related content by tag, category, or theme.
- Generate a full CE course package from selected content.
- Generate multiple-choice quiz questions with citations back to the source articles.
- Provide a demo quiz-taking experience for internal review.
- Save completed CE course packages to the database so they can be edited and retrieved later.
- Prepare for a future outbound API so another system can retrieve completed CE packages from Editorial.
- Prepare a future path for one-button delivery to AdvisorStream.
- Leave room for later course submission automation, such as email-based submission to governing bodies.
- Defer Sora video generation until quiz/course creation works well.

## First Version Scope

The first version should generate:

- Course title.
- Learning objective.
- Selected article list.
- Quiz.
- Answer key.
- Passing score.
- Completion notes.
- Source citations for each quiz question.
- Preview/take-quiz demo experience.
- Saved course package record in Supabase.
- Ability to edit saved quiz questions before export or downstream retrieval.

## Source Selection

Users should be able to manually select 1 to 5 Forefield content items from existing sources.

The source selection experience should include:

- Tag filtering toggle.
- Category/theme filtering for topics such as Bonds, 529 Plans, and Homeowners Insurance.
- Recommendations for related articles under the same theme or category.
- Clear selected-source review before generation.

## Quiz Rules

- Question type: multiple choice only.
- Choices per question: 4.
- Minimum questions: 10.
- Maximum questions: 25.
- Target generation rule: roughly 5 questions per selected article.
- If only one article is selected, still generate at least 10 questions.
- Difficulty: easy to medium.
- Tone: confirm the learner read and understood the content, not trick questions.
- Passing score: 60%.
- Citations: each question should cite the source article it came from.
- Editorial users should be able to edit generated questions, answer choices, correct answers, explanations, and citations before export.
- Saved quizzes should remain editable after they are saved.

## Demo Quiz Experience

The app should provide a simple learner-style preview so Editorial can test and demo the quiz before sending it elsewhere.

The preview should show:

- Course title.
- Learning objective.
- Reading list.
- Quiz questions.
- Four choices per question.
- Links or citations to the source material while taking the quiz, because learners have access to the reading material.
- A source detail view or adapted existing View Details component for seeing the article tied to a question.
- Result state based on the 60% passing score.
- Answer key and source citations for review.
- Optional post-completion source highlighting or source-detail review that can show where an answer came from, similar to existing highlight/detail tools.

## Persistence and API

Completed CE course packages should be savable to Supabase as first-class records. A future implementation can introduce a dedicated table for CE courses and related quiz questions.

The saved package should support:

- Course metadata.
- Selected source IDs.
- Generated title and learning objective.
- Generated quiz questions and answer key.
- Completion notes.
- Passing score.
- Edit history fields such as created/updated timestamps.
- Retrieval by a future outbound API.

The outbound API format is intentionally deferred. AdvisorStream integration may start manually, then evolve into API retrieval, export, or another delivery format after requirements are known.

## Out of Scope for First Version

- Audit trail.
- Approval workflow.
- Governing body submission automation.
- Sora video generation.
- Full learner account management.
- Production quiz hosting as the final learner destination.
- Final AdvisorStream export/API format.

## Later Enhancements

- One-button "Send Quiz to AdvisorStream" workflow.
- Automated course submission support for governing bodies, possibly through an email workflow.
- Sora narrated video generation from the selected course articles, using spoken audio and content-associated visuals.
- Video module packaging with runtime, completion threshold, and attestation text.
- Export formats for external CE/course systems.

## Open Questions

- Which exact source fields should be shown in the course reading list?
- What fields should be included in the first Supabase CE course package table?
- Should source detail during quiz preview reuse the existing source View Details component directly or use a lighter CE-specific variant?
- What export or retrieval format will AdvisorStream eventually need?
- Which governing bodies have the most important submission requirements?
- What is the minimum useful Sora/narrated-video scope once quiz generation is stable?`;

const roadmapIdeas: RoadmapIdea[] = [
  {
    title: 'Carousel Output Styles',
    status: 'Now',
    theme: 'Instagram Carousel',
    summary: 'Add more visual output styles so carousel generation has more variety across campaigns.',
    details: [
      'Add a larger style menu for layout, mood, density, typography, and slide rhythm.',
      'Keep existing carousel review modes, but let the generation plan pick a stronger style direction before image creation.',
      'Keep output style choices focused on carousel composition, format, and presentation rather than full brand-system setup.',
    ],
    icon: GalleryHorizontalEnd,
    impact: 9,
    effort: 6,
    matrix: { x: 63, y: 15 },
    accent: 'from-cyan-400 via-emerald-300 to-lime-300',
  },
  {
    title: 'User Customizations',
    status: 'Later',
    theme: 'Platform and Content',
    summary: 'Let teams customize the platform wrapper and generation assets around their own brand system.',
    details: [
      'Add white-label platform naming, brand colors, logo uploads, and reusable asset controls.',
      'Support content overlays for logos, campaign marks, approved visual treatments, and brand style references.',
      'Include optional disclaimer blocks that can be reused across generated content and review workflows.',
      'Let future generators borrow approved palette, type, spacing, and image-treatment cues from the team profile.',
    ],
    icon: BadgeCheck,
    impact: 8,
    effort: 6,
    matrix: { x: 58, y: 38 },
    accent: 'from-lime-300 via-cyan-300 to-blue-300',
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
      'Leave room for CE-credit video modules that need runtime, completion, and attestation data.',
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
    title: 'CE Course Creator',
    status: 'Now',
    theme: 'Learning and Compliance',
    summary: 'Build CE course packages from selected Forefield content, starting with quiz generation.',
    details: [
      'Let Editorial select 1 to 5 Forefield source pieces and generate a full course package.',
      'Use tag filtering and theme/category recommendations to find related articles such as Bonds, 529 Plans, or Homeowners Insurance.',
      'Generate title, learning objective, article list, quiz, answer key, passing score, completion notes, and source citations.',
      'Add a demo quiz-taking preview with a 60% passing score so the team can test the course before export.',
      'Save CE course packages in Supabase so the team can reopen and edit quizzes after saving.',
      'Plan for a future outbound API that lets another system retrieve completed course packages from Editorial.',
      'Later, support one-button Send Quiz to AdvisorStream.',
      'Later, explore automated course submission to governing bodies, possibly through email workflow support.',
      'Later, explore Sora narrated article videos with spoken audio and visuals associated with the selected content.',
    ],
    promptData: [
      'Selected source IDs, tags, categories, theme, titles, article bodies, and source citations.',
      'Question count from 10 to 25, with roughly 5 easy-to-medium multiple-choice questions per article.',
      'Four answer choices per question, correct answer, explanation, citation, and learner-facing completion notes.',
    ],
    prd: {
      title: 'CE Course Creation PRD',
      description: 'Draft product requirements for creating CE course packages from Forefield source content.',
      content: ceCourseCreationPrd,
    },
    icon: BadgeCheck,
    impact: 8,
    effort: 7,
    matrix: { x: 47, y: 59 },
    accent: 'from-blue-300 via-cyan-200 to-white',
  },
  {
    title: 'Generation Speed Pass',
    status: 'Now',
    theme: 'Content Generation',
    summary: 'Improve perceived and actual generation speed by loading individual output pieces as soon as they are ready.',
    details: [
      'Break generated output into smaller pieces so text, settings, previews, and supporting UI can appear independently.',
      'Look for slower image-loading paths and prioritize thumbnails, previews, and generated images that users need first.',
      'Explore streaming or progressive status updates so users can see content generation moving instead of waiting on one large response.',
      'Keep the Generate Content screen responsive while longer image or carousel work continues in the background.',
    ],
    promptData: [
      'Timing checkpoints for source loading, prompt assembly, model response, image generation, and preview rendering.',
      'Which elements can stream first, which should lazy-load, and which should wait for final save/review.',
      'Fallback states for slow image loads, partial generation, retries, and background progress.',
    ],
    icon: Gauge,
    impact: 9,
    effort: 6,
    matrix: { x: 50, y: 18 },
    accent: 'from-emerald-300 via-cyan-300 to-sky-300',
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
  {
    title: 'Print',
    status: 'Later',
    theme: 'Experimental Print',
    summary: 'Mock the first print workflow surface so Editorial can start exploring a future print product area.',
    details: [
      'Landing page and SSO entry for getting print users into the right workspace.',
      'Storefront mock for browsing print-ready products and campaign pieces.',
      'My Orders plus very basic billing so the happy path feels real enough to react to.',
    ],
    joke: 'Print request arrives. Roadmap quietly opens a new tab called “This Again?”',
    icon: Printer,
    impact: 7,
    effort: 8,
    matrix: { x: 77, y: 78 },
    accent: 'from-pink-300 via-yellow-200 to-cyan-300',
  },
  {
    title: 'Uploaded Asset Remix',
    status: 'Later',
    theme: 'Asset Generation',
    summary: 'Let users upload approved visual assets as references for generating new campaign assets much later.',
    details: [
      'Support uploaded reference assets such as character art, team cartoons, campaign icons, and approved illustration styles.',
      'Use those assets to guide new image generation without forcing users to rebuild the visual direction from scratch.',
      'Keep review controls clear so teams can approve whether generated assets are close enough to the uploaded reference set.',
      'Example: upload JIMA team cartoons and generate new campaign visuals in the same general character style.',
    ],
    promptData: [
      'Reference asset type, usage rights, visual style notes, and allowed transformations.',
      'Brand guardrails for character likeness, palette, poses, background treatment, and campaign context.',
      'Reviewer notes for what must stay consistent versus what the model can reinterpret.',
    ],
    icon: ImagePlus,
    impact: 7,
    effort: 9,
    matrix: { x: 86, y: 70 },
    accent: 'from-cyan-200 via-blue-200 to-fuchsia-200',
  },
  {
    title: 'Infographic Inception',
    status: 'Later',
    theme: 'Infographic Remix',
    summary: 'Go beyond infographic copy by generating a new infographic from another infographic.',
    details: [
      'Upload or select an existing infographic as the source material.',
      'Extract the core claims, hierarchy, visual sections, and reusable chart ideas.',
      'Generate a fresh infographic concept with new layout, wording, and brand treatment instead of copying the original.',
    ],
    joke: 'An infographic inside an infographic inside an infographic. The charts are looking at the charts like 👀📊🌀🤯',
    icon: ImagePlus,
    impact: 7,
    effort: 7,
    matrix: { x: 66, y: 67 },
    accent: 'from-violet-300 via-sky-300 to-emerald-200',
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
              <RoadmapStat icon={Sparkles} value="10" label="seed ideas" tone="dark" />
              <RoadmapStat icon={Flag} value="2" label="planning views" tone="dark" />
              <RoadmapStat icon={Clock3} value="Later" label="customization pass" tone="dark" />
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
        <RoadmapDetailsDialog idea={idea} />
      </div>
    </article>
  );
}

function RoadmapDetailsDialog({ idea }: { idea: RoadmapIdea }) {
  const Icon = idea.icon;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="mt-4 w-full justify-center gap-2">
          <FileText className="h-4 w-4" />
          Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none overflow-hidden p-0 sm:max-w-[min(940px,calc(100vw-2rem))]">
        <DialogHeader className="border-b border-border bg-card px-6 py-5 pr-12 text-left">
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${idea.accent} text-slate-950`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle>{idea.title}</DialogTitle>
              <DialogDescription className="mt-2 leading-6">
                {idea.theme} - {idea.status} - Impact {idea.impact}/10 - Effort {idea.effort}/10
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto bg-background px-6 py-5">
          <div className="space-y-5">
            <section>
              <h5 className="text-sm font-semibold">Summary</h5>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{idea.summary}</p>
            </section>

            <section>
              <h5 className="text-sm font-semibold">Roadmap Details</h5>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {idea.details.map((detail) => (
                  <li key={detail} className="flex gap-2">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </section>

            {idea.promptData ? (
              <section className="rounded-md border border-border bg-muted/40 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-primary">
                  <Captions className="h-3.5 w-3.5" />
                  Prompt Data To Add
                </div>
                <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
                  {idea.promptData.map((item) => (
                    <div key={item} className="flex gap-2">
                      <BadgeCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {idea.prd ? (
              <section>
                <h5 className="text-sm font-semibold">{idea.prd.title}</h5>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{idea.prd.description}</p>
                <pre className="mt-3 max-h-[420px] overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/35 p-4 font-mono text-xs leading-6 text-muted-foreground">
                  {idea.prd.content}
                </pre>
              </section>
            ) : null}

            {idea.joke ? (
              <section className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-4 text-sm font-medium leading-6 text-foreground">
                {idea.joke}
              </section>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
