'use client';

import Link from 'next/link';
import { useMemo, useState, type ComponentType } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Compass,
  FolderOpen,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  Library,
  Lightbulb,
  ListChecks,
  PenSquare,
  Search,
  SearchCheck,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Icon = ComponentType<{ className?: string }>;

type HelpGuide = {
  id: string;
  title: string;
  eyebrow: string;
  href: string;
  icon: Icon;
  description: string;
  bestFor: string[];
  steps: string[];
  tips: string[];
  keywords: string[];
};

const helpGuides: HelpGuide[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    eyebrow: 'Start here',
    href: '/',
    icon: LayoutDashboard,
    description:
      'Use the dashboard to understand the workspace status, jump into high-priority workflows, and monitor saved content activity.',
    bestFor: [
      'Checking whether content sync and generation routes are ready.',
      'Starting common workflows such as campaign creation, source review, or editorial drafting.',
      'Getting a quick read on generated asset volume and output mix.',
    ],
    steps: [
      'Review the workflow health panel before starting a new content task.',
      'Use Priority Workflows to jump directly into Generate Content, Content Scan, or EchoWrite.',
      'Scan the metrics cards to understand recent saved output activity.',
    ],
    tips: [
      'The dashboard is an orientation screen, not the source of record for content.',
      'If counts look stale, check Saved Content and Source Content directly.',
    ],
    keywords: ['home', 'overview', 'metrics', 'workflow health', 'campaigns'],
  },
  {
    id: 'generate',
    title: 'Generate Content',
    eyebrow: 'Create assets',
    href: '/generate',
    icon: Sparkles,
    description:
      'Use Generate Content to turn selected source material into channel-specific assets such as social posts, email copy, newsletters, articles, FAQs, infographic copy, and video scripts.',
    bestFor: [
      'Creating quick marketing-ready drafts from one or more source articles.',
      'Building platform-specific content from synced and reviewed source material.',
      'Starting from selected content in Source Content or choosing a Quick Create format from the sidebar.',
    ],
    steps: [
      'Choose the content type that matches the channel or deliverable.',
      'Select source content when the draft needs to stay grounded in approved material.',
      'Set tone and generation options before running the draft.',
      'Review the output, then save useful drafts into Saved Content.',
    ],
    tips: [
      'For Instagram carousel work, keep the selected source focused. Too much source text can make image planning less predictable.',
      'Use plain source body text for AI generation. Rich XML/HTML is mainly for View Detail reading.',
      'Save only drafts that are worth review or reuse.',
    ],
    keywords: ['generate', 'social', 'email', 'newsletter', 'article', 'faq', 'video script', 'carousel'],
  },
  {
    id: 'echowrite',
    title: 'EchoWrite',
    eyebrow: 'Editorial drafting',
    href: '/echo-write',
    icon: PenSquare,
    description:
      'Use EchoWrite for longer editorial drafting with source grounding, inline source evidence, and a focused writing surface.',
    bestFor: [
      'Drafting article-style copy from multiple source references.',
      'Creating readable video scripts with hook, script, on-screen text, and CTA structure.',
      'Checking which source passages supported the generated draft.',
    ],
    steps: [
      'Write a clear prompt describing the content goal and audience.',
      'Choose article or video script, writing style, length, and maximum sources.',
      'Generate the draft and inspect the source list beside the editor.',
      'Hover or open source details to verify evidence before saving.',
      'Save approved working drafts to Saved Content.',
    ],
    tips: [
      'Use EchoWrite when readability and source attribution matter more than fast one-off output.',
      'For video scripts, keep the prompt specific about runtime, audience, and desired call to action.',
      'The Last generation prompt modal is useful when debugging model behavior.',
    ],
    keywords: ['echowrite', 'editor', 'article', 'video script', 'citations', 'sources', 'draft'],
  },
  {
    id: 'source-content',
    title: 'Source Content',
    eyebrow: 'Find source material',
    href: '/source-content',
    icon: FolderOpen,
    description:
      'Use Source Content to browse synced provider material, filter by metadata, inspect article details, and send selected content into generation workflows.',
    bestFor: [
      'Finding advisor-ready source articles before creating new assets.',
      'Reviewing FINRA-reviewed source material and provider metadata.',
      'Selecting one or more sources to use as grounding material for Generate Content.',
    ],
    steps: [
      'Search by topic, phrase, title, or source metadata.',
      'Use filters for type, tag, publisher, or designation when narrowing results.',
      'Open View Details to inspect the article body, rich XML rendering, metadata, and image assets.',
      'Select one or more items and choose Generate with selected.',
    ],
    tips: [
      'Use View Details when layout, tables, bullets, or provider metadata matter.',
      'If a source body looks wrong, note whether the plain body, XML, or HTML version is affected.',
      'Content Sync in Settings controls how source records get refreshed.',
    ],
    keywords: ['source', 'articles', 'broadridge', 'forefield', 'advisorstream', 'metadata', 'finra', 'details'],
  },
  {
    id: 'library',
    title: 'Saved Content',
    eyebrow: 'Manage drafts',
    href: '/library',
    icon: Library,
    description:
      'Use Saved Content as the working library for generated drafts, reviewed pieces, approved assets, and reusable campaign content.',
    bestFor: [
      'Finding previously generated content by type, status, or search term.',
      'Editing saved drafts after generation.',
      'Copying or preparing content for review and downstream use.',
    ],
    steps: [
      'Search or filter by content type and status.',
      'Open a saved item to view or edit the full draft.',
      'Update status as content moves through draft, review, approved, and published states.',
      'Copy finished content when it is ready to use outside Editorial.',
    ],
    tips: [
      'Saved Content is the durable workspace. Unsaved generated output can be lost when leaving a generator page.',
      'Use statuses consistently so the team can tell what still needs review.',
    ],
    keywords: ['saved', 'library', 'drafts', 'review', 'approved', 'published', 'copy', 'edit'],
  },
  {
    id: 'content-scan',
    title: 'Content Scan',
    eyebrow: 'Audit coverage',
    href: '/audit',
    icon: SearchCheck,
    description:
      'Use Content Scan to search, analyze, and mark source coverage before building or refreshing advisor content.',
    bestFor: [
      'Checking whether source inventory already covers a topic.',
      'Finding exact phrases, included terms, and excluded terms across source body text.',
      'Using AI-assisted analysis when a request is semantic or nuanced.',
    ],
    steps: [
      'Choose Standard Search for exact terms and phrase matching.',
      'Choose AI Analyze for natural-language coverage questions.',
      'Add include and exclude terms to reduce irrelevant matches.',
      'Open details on promising matches, then mark items that need update when appropriate.',
    ],
    tips: [
      'Use quotes for exact phrases in Standard Search.',
      'Use AI Analyze when you care about meaning, not only exact wording.',
      'Content Scan helps decide what to update before creating new content.',
    ],
    keywords: ['scan', 'audit', 'search', 'coverage', 'include', 'exclude', 'AI analyze', 'mark'],
  },
  {
    id: 'settings',
    title: 'Settings',
    eyebrow: 'Admin tools',
    href: '/settings',
    icon: Settings2,
    description:
      'Use Settings for source sync operations, provider API inspection, this help center, and advanced carousel generation tuning.',
    bestFor: [
      'Running source content sync and reviewing sync logs.',
      'Inspecting provider API responses in Content API Explorer.',
      'Reading tool documentation and advanced generation notes.',
      'Testing Instagram Carousel 2.0 behavior outside the main generator flow.',
    ],
    steps: [
      'Use Content Sync to import or refresh provider content.',
      'Use Content API Explorer when diagnosing provider response fields.',
      'Use Knowledge Center for tool instructions and team workflow guidance.',
      'Use Instagram Carousel 2.0 for advanced carousel generation tuning.',
    ],
    tips: [
      'Sync and Update refreshes richer detail fields for source detail rendering.',
      'Avoid running large syncs while validating unrelated UI behavior.',
      'Provider schema changes should be captured here or in handoff notes.',
    ],
    keywords: ['settings', 'sync', 'logs', 'api explorer', 'knowledge center', 'carousel'],
  },
];

const quickAnswers = [
  {
    question: 'Where should I start a new advisor content task?',
    answer:
      'Start in Source Content when you need approved source material first. Start in Generate Content when you already know the source or format. Start in EchoWrite for longer editorial drafting.',
  },
  {
    question: 'When should I use EchoWrite instead of Generate Content?',
    answer:
      'Use EchoWrite for article drafts, video scripts, and source-grounded writing where the team needs to inspect supporting evidence. Use Generate Content for faster format-specific drafts.',
  },
  {
    question: 'Where do finished or useful drafts go?',
    answer:
      'Save them to Saved Content. That is the durable workspace for review, edits, approval status, and reuse.',
  },
  {
    question: 'How do I check whether we already have content on a topic?',
    answer:
      'Use Content Scan. Standard Search is best for exact phrases; AI Analyze is best for natural-language coverage questions.',
  },
];

const carouselNotes = [
  {
    title: 'Style should own',
    items: [
      'Palette, colors, lighting, mood, and texture.',
      'Global visual constraints such as no vignette, no borders, and no edge banding.',
      'Text color and typography direction.',
    ],
  },
  {
    title: 'SlideCard Template should own',
    items: [
      'Text placement, layout, hierarchy, max lines, and padding.',
      'Prompt composition intent such as cover, explanatory, or CTA slide.',
      'Reserved negative-space zones where text needs to remain legible.',
    ],
  },
  {
    title: 'Standard slide variants',
    items: [
      'diagram: map, diagram, or schematic feel.',
      'chart: one simple supporting chart element.',
      'photo: editorial photo subject matching the source gist.',
      'icon: large symbolic shape integrated into the background.',
      'texture: pattern or surface related to the source gist.',
    ],
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function guideMatches(guide: HelpGuide, query: string) {
  if (!query) return true;

  const haystack = [
    guide.title,
    guide.eyebrow,
    guide.description,
    ...guide.bestFor,
    ...guide.steps,
    ...guide.tips,
    ...guide.keywords,
  ]
    .join(' ')
    .toLowerCase();

  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export default function KnowledgeBase() {
  const [query, setQuery] = useState('');
  const [activeGuideId, setActiveGuideId] = useState(helpGuides[0].id);
  const normalizedQuery = normalize(query);

  const filteredGuides = useMemo(
    () => helpGuides.filter((guide) => guideMatches(guide, normalizedQuery)),
    [normalizedQuery]
  );

  const activeGuide = useMemo(
    () =>
      helpGuides.find((guide) => guide.id === activeGuideId) ||
      filteredGuides[0] ||
      helpGuides[0],
    [activeGuideId, filteredGuides]
  );

  const ActiveIcon = activeGuide.icon;

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="bg-[linear-gradient(135deg,#11285a_0%,#143a7b_58%,#0f6f8f_100%)] p-6 text-white sm:p-7">
            <Badge className="mb-4 border-white/20 bg-white/10 text-white hover:bg-white/10">
              Team help center
            </Badge>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight">Knowledge Center</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50/85">
              Search practical guidance for the tools the internal curation team uses to find,
              update, create, review, and reuse advisor content.
            </p>
          </div>
          <div className="grid content-center gap-3 bg-secondary/60 p-6 sm:p-7">
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <BookOpenCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{helpGuides.length} tool guides</p>
                  <p className="text-xs text-muted-foreground">
                    Built around the primary left navigation workflow.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-primary">
                  <HelpCircle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Use this before asking how</p>
                  <p className="text-xs text-muted-foreground">
                    Guides cover purpose, steps, and practical operating notes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search help by tool, task, format, source, scan, sync, or review..."
            className="bg-muted/50 pl-9"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase text-primary">Tool Guides</p>
            <h3 className="text-lg font-semibold">Main navigation help</h3>
          </div>
          <div className="grid gap-2">
            {filteredGuides.length ? (
              filteredGuides.map((guide) => {
                const GuideIcon = guide.icon;
                const active = guide.id === activeGuide.id;

                return (
                  <button
                    key={guide.id}
                    type="button"
                    onClick={() => setActiveGuideId(guide.id)}
                    className={`flex items-center gap-3 rounded-md border p-3 text-left transition-colors ${
                      active
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border bg-background hover:border-primary/35 hover:bg-accent/45'
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}`}>
                      <GuideIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{guide.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{guide.eyebrow}</span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No guide matches that search yet.
              </div>
            )}
          </div>
        </div>

        <article className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ActiveIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase text-primary">{activeGuide.eyebrow}</p>
                <h3 className="text-2xl font-semibold">{activeGuide.title}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {activeGuide.description}
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href={activeGuide.href}>
                Open Tool
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-md border border-border bg-secondary/35 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Compass className="h-4 w-4 text-primary" />
                Best For
              </div>
              <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                {activeGuide.bestFor.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-md border border-border bg-secondary/35 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <ListChecks className="h-4 w-4 text-primary" />
                How To Use It
              </div>
              <ol className="space-y-2 text-sm leading-6 text-muted-foreground">
                {activeGuide.steps.map((item, index) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-background text-xs font-semibold text-foreground">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-md border border-border bg-secondary/35 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Lightbulb className="h-4 w-4 text-primary" />
                Helpful Notes
              </div>
              <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                {activeGuide.tips.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase text-primary">Quick Answers</p>
          <h3 className="text-xl font-semibold">Common team questions</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {quickAnswers.map((item) => (
            <div key={item.question} className="rounded-md border border-border bg-background p-4">
              <h4 className="text-sm font-semibold">{item.question}</h4>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Advanced Reference</p>
            <h3 className="text-xl font-semibold">Instagram Carousel 2.0 generation notes</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              These notes preserve the previous Knowledge Base guidance for carousel image planning.
              They are intended for tuning and debugging, not day-to-day user onboarding.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings?tab=instagram-carousel-2">
              Open Carousel 2.0
              <ImageIcon className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {carouselNotes.map((note) => (
            <div key={note.title} className="rounded-md border border-border bg-secondary/35 p-4">
              <h4 className="text-sm font-semibold">{note.title}</h4>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {note.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
