'use client';

import { useEffect, useRef, useState, type CSSProperties, type WheelEvent } from 'react';
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
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ProductUpdateTab = 'change-log' | 'visual-log';

type ReleaseStory = {
  period: string;
  title: string;
  kicker: string;
  icon: LucideIcon;
  commitRefs: string[];
  summary: string;
  story: string;
  result: string;
  details: string[];
  accent: string;
  panel: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const changelogGroups = [
  {
    period: 'Released May 27, 2026',
    theme: 'Visual Product Updates',
    commits: ['489799a', '4464163', '467c0a6', '58c0ec2', '6263c26', '8e18d83'],
    icon: Eye,
    items: [
      'Added Product Updates as a Settings destination with Visual Log as the default experience.',
      'Built the chapter-based release story, then fixed the scroll model so chapters are real visible panels instead of empty parallax positions.',
      'Strengthened the pinned gradient background, tile-card parallax, chapter jump controls, and sticky progress/navigation rail.',
    ],
  },
  {
    period: 'Released May 27, 2026',
    theme: 'Source Metadata and Tag Explorer',
    commits: ['968203c', '873b96a'],
    icon: Tags,
    items: [
      'Added Settings -> Tag Explorer so the team can inspect tag counts, top tags, cleanup candidates, and case variants.',
      'Linked tag rows back into Source Content with the selected tag already applied.',
      'Centralized designation and tag color treatment so labels stay consistent across Source Content, generation, modals, and pickers.',
    ],
  },
  {
    period: 'Released May 27, 2026',
    theme: 'Instagram Preview and Carousel Review',
    commits: ['355b2cc', 'a1d0eac', '77733ad', 'c10ff84', 'a3f0822'],
    icon: Smartphone,
    items: [
      'Renamed the carousel output surface to Instagram Preview and made it the default review view.',
      'Generated an ambient preview backdrop from carousel artwork so the phone mockup feels connected to the asset being reviewed.',
      'Centered the swipe preview and moved Carousel 2.0 into the Settings navigation so review controls are easier to find.',
    ],
  },
  {
    period: 'Released May 27, 2026',
    theme: 'Generation Metrics and Feedback',
    commits: ['56a7e87', '1ab20dd', '4ed9cb1'],
    icon: DatabaseZap,
    items: [
      'Moved generated asset counts onto durable Supabase-backed generation events across EchoWrite, Generate, carousel planning, slides, and image tests.',
      'Separated generated image tracking from written content output so dashboard metrics can distinguish asset types.',
      'Added larger in-place progress states and cleaned up source preview layout so generation work reports back while it is running.',
    ],
  },
  {
    period: 'Released May 27, 2026',
    theme: 'Dashboard and Internal Tool Identity',
    commits: ['9619395', 'c763ba3', '3c003c3', 'a9917fe', 'd9c50a5', 'ece532a'],
    icon: Rocket,
    items: [
      'Refocused dashboard language around the Editorial Team and the internal work of finding, creating, reviewing, and reusing content.',
      'Added a Template Design System page for reviewing workflow colors, page patterns, rows, and examples.',
      'Removed extra platform/header language so Settings and the sidebar feel more like an app workspace than a marketing shell.',
    ],
  },
  {
    period: 'Released May 27, 2026',
    theme: 'Knowledge Center and Help Chat',
    commits: ['d803ae2', '049a5ff', 'bf1e72e', 'ec15509', '78c6e05'],
    icon: PanelTop,
    items: [
      'Built the Knowledge Center framework and expanded it into workflow playbooks, task paths, guardrails, glossary content, and troubleshooting entries.',
      'Added a help-only support chat backed by local Knowledge Center retrieval, then moved it into a common popout widget pattern.',
      'Kept the assistant scoped to help content so it can answer workflow questions without running app actions or changing records.',
    ],
  },
  {
    period: 'Released May 14-27, 2026',
    theme: 'Source Content Review Foundation',
    commits: ['694d44b', '719a4c6', 'f24d947', '32fdb0d', '51d201e', '6552850', 'd4bec6b'],
    icon: Layers3,
    items: [
      'Stored richer source bodies and rendered structured provider content more cleanly, including XML-like content that previously read poorly.',
      'Kept source list responses lightweight while improving detail modals, metadata links, filters, headers, compliance cards, card badges, and pagination.',
      'Added source quality and identity signals such as FINRA-reviewed status, filenames, publisher labels, designations, external IDs, and richer source metadata.',
    ],
  },
  {
    period: 'Released May 15-27, 2026',
    theme: 'EchoWrite Grounding and Content Scan',
    commits: ['cefacbe', 'bdd1c82', '49127f6', '31bb106', 'f2ab294', '8fb2692', 'c718a58'],
    icon: WandSparkles,
    items: [
      'Added EchoWrite as an AI editorial workflow with RAG-style source grounding, rich text editing, prompt inspection, and source-attributed highlights.',
      'Hardened grounding with better retrieval scoring, attribution, source evidence, cited-source saving, visible grounding status, and source detail drill-ins.',
      'Built Content Scan from the earlier Content Audit work with standard search, AI Analyze, fallback parsing, CSV export, bulk update marking, diagnostics, and clearer result states.',
    ],
  },
  {
    period: 'Released May 25-26, 2026',
    theme: 'Generate KIT Workflow and Output Review',
    commits: ['3f0f265', 'ad41760', 'f83b2c9', 'a895e7f', '75d6613', '0db7caf', '6540d0f'],
    icon: Sparkles,
    items: [
      'Turned Generate into a KIT workflow that can produce multiple asset types together while keeping single-asset generation available.',
      'Unified carousel, masterplate, generated copy, and all-output review into one output area with clearer tabbing and copy actions.',
      'Improved source selection, selected-content previews, thumbnails, body snippets, campaign-friendly headers, and generation progress feedback.',
    ],
  },
  {
    period: 'Released May 16-21, 2026',
    theme: 'Carousel 2.0 Image Generation System',
    commits: ['0e3fa88', '396d628', '3528b64', '79c19d7', 'd6baa24', '9d08dfe', '5c28b52'],
    icon: Images,
    items: [
      'Added Carousel 2.0 as a dedicated image-generation workflow with source article picking, generation settings, prompt logging, and image-test tooling.',
      'Built masterplate, sequential, swipe, tile, compact, and split-panel review modes so generated carousel images can be inspected in different layouts.',
      'Iterated on cohesion methods, slide counts, prompt rules, seamless backgrounds, source-body injection, advanced controls, and OpenAI image edit/reference flows.',
    ],
  },
  {
    period: 'Released May 16-17, 2026',
    theme: 'Carousel Design Templates and Prompt System',
    commits: ['9b70eb0', '07a51f7', '181ae64', 'ebafe34', 'ba3ae53', '1c9ca5a', '8141fc2'],
    icon: PanelTop,
    items: [
      'Created carousel templates for intro, standard, and outro slides with style variants such as purple-gold and Frost.',
      'Documented and refined the prompt system around template hints, art direction, storyboard scenes, visual types, CTA handling, and source gists.',
      'Polished slide rendering with loaders, labels, full-bleed previews, foreground motifs, readable text treatment, and clipping fixes.',
    ],
  },
  {
    period: 'Released May 15-16, 2026',
    theme: 'EchoWrite Editing Experience',
    commits: ['144f3bc', '0340733', 'd1644bf', 'b52f0de', 'b01dd0a', '8be609d', 'cdf375f'],
    icon: ScrollText,
    items: [
      'Improved EchoWrite output formatting so articles, headings, paragraphs, and video scripts read naturally in review.',
      'Added edit/highlight mode controls, Tiptap stability fixes, robust source detail modals, hover-linked evidence cards, and per-source color systems.',
      'Reduced citation clutter and made source matching more resilient by cleaning paragraphs, preserving highlight HTML, and mapping snippets positionally.',
    ],
  },
  {
    period: 'Released May 14, 2026',
    theme: 'Broadridge and AdvisorStream Sync',
    commits: ['ebacbd4', 'd0e6a9b', 'a4a031c', '6ed1272', '6100baf', '6f3b204', '8dde223'],
    icon: DatabaseZap,
    items: [
      'Built provider sync controls for sample seed, AdvisorStream OAuth, article search, full-feed pagination, dry runs, and batched Broadridge sync.',
      'Hardened provider mapping around nested payloads, detail enrichment, source filtering, date fields, duplicate detection, external IDs, and non-JSON provider errors.',
      'Added sync diagnostics, logs, completion toasts, run IDs, resume support, provider caps, and source-count visibility for operational review.',
    ],
  },
  {
    period: 'Released May 13-14, 2026',
    theme: 'API Lab and Provider Troubleshooting',
    commits: ['8f20b04', 'd21b9b3', '3ff8963', 'b09a51c', '0ec71d8', '3087d83', '97d9d20'],
    icon: BadgeCheck,
    items: [
      'Added API Lab as an in-app troubleshooting surface for provider metadata, article lookup, search presets, image-test diagnostics, and response inspection.',
      'Used API Lab and diagnostic endpoints to debug image payloads, base64 rendering, provider backfill, date/publisher repair, and runtime environment health.',
      'Kept lower-level provider repair controls out of the main Source Content screen once the troubleshooting workflow had a dedicated home.',
    ],
  },
  {
    period: 'Released May 13-16, 2026',
    theme: 'Generated Content Backend and App Shell',
    commits: ['dc5192b', '22f87df', 'b126e25', '6dd5909', 'd295a8c', '84a4681', 'bf5bdc7'],
    icon: Rocket,
    items: [
      'Established the OpenAI and Supabase foundation, generated-content API, save/edit/delete flows, dashboard stats, and recent activity.',
      'Moved source content, generated content, and metrics onto backend-backed routes instead of demo-only client state.',
      'Renamed the app to EDITOR[AI]L and shaped the app shell with Settings tabs, Source Content, Saved Content, Dashboard, Generate, and EchoWrite navigation.',
    ],
  },
  {
    period: 'Released May 13, 2026',
    theme: 'Initial Prototype Import',
    commits: ['e2f7c27', 'b58f37b', '46861ba', 'eb15574', '073d066'],
    icon: GitCommit,
    items: [
      'Imported the original ff-content-creator prototype and pinned the package manager/lockfile for deployment consistency.',
      'Fixed early build/runtime blockers such as search params suspense, build-time API route failures, and lazy environment loading.',
      'Added the first project tracking notes and sample content export that later supported Source Content and generation workflows.',
    ],
  },
];

const releaseStories: ReleaseStory[] = [
  {
    period: 'Week of May 27',
    title: 'Instagram Preview becomes the stage',
    kicker: 'Carousel',
    icon: Smartphone,
    commitRefs: ['355b2cc', 'a1d0eac', '77733ad'],
    summary: 'The carousel output moved from a utility preview into a richer Instagram-style review surface.',
    story: 'The carousel work used to feel like a file preview. This round turns it into a review moment: the default output now opens in an Instagram-style frame, the active slide stays centered, and the surrounding preview borrows color and texture from the generated carousel so the team can judge the asset in context.',
    result: 'Generated carousel assets now feel reviewable as a social post, not just as isolated image files.',
    details: [
      'Instagram Preview is now the default carousel output view.',
      'The phone mockup can use a generated ambient backdrop from the carousel artwork.',
      'The swipe preview keeps the active square centered without adjacent slide bleed.',
    ],
    accent: 'from-slate-950 via-indigo-600 to-cyan-400',
    panel: 'border-cyan-300/25 bg-cyan-300/10',
  },
  {
    period: 'Week of May 27',
    title: 'Generation starts reporting back',
    kicker: 'Metrics',
    icon: Sparkles,
    commitRefs: ['56a7e87', '1ab20dd'],
    summary: 'Generated assets moved from a static dashboard number to durable activity tracked over time.',
    story: 'Generated work is no longer treated as a loose counter on the dashboard. Each meaningful generation event now writes back as durable activity, which gives Editorial a better record of what the team is producing across content drafts, EchoWrite, carousel captions, and generated images.',
    result: 'The dashboard can now show how much work the platform is helping the team produce during testing and beyond.',
    details: [
      'Generated assets are backed by persistent generation events.',
      'Generated images are counted separately from written content outputs.',
      'Large in-place progress states make active generation easier to understand.',
    ],
    accent: 'from-violet-500 via-fuchsia-400 to-sky-300',
    panel: 'border-violet-300/25 bg-violet-300/10',
  },
  {
    period: 'Week of May 27',
    title: 'Metadata becomes a navigation system',
    kicker: 'Tags',
    icon: Tags,
    commitRefs: ['968203c', '873b96a'],
    summary: 'Tags and designations became visible, consistent, and measurable across the editorial workspace.',
    story: 'Metadata is starting to behave like a navigation layer instead of decoration. Tags and designations now use shared color logic, and Tag Explorer gives the team a place to inspect usage patterns, spot cleanup candidates, and jump back into the source library by tag.',
    result: 'The content library is easier to scan and the team now has a path toward tag governance.',
    details: [
      'Content designations and tags share consistent color treatment.',
      'Tag Explorer highlights counts, single-use tags, and case variants.',
      'Every tag row can open Source Content already filtered to that tag.',
    ],
    accent: 'from-teal-500 via-sky-400 to-indigo-400',
    panel: 'border-teal-300/25 bg-teal-300/10',
  },
  {
    period: 'Week of May 27',
    title: 'The app gets its internal voice',
    kicker: 'Dashboard',
    icon: Rocket,
    commitRefs: ['9619395', '3c003c3', 'c763ba3'],
    summary: 'The dashboard and design reference shifted away from external marketing language and toward the Editorial Team.',
    story: 'The app is settling into its identity as an internal editorial workspace. The dashboard language now speaks to the people finding, updating, creating, and reviewing content, while the design system page gives future screens a shared visual reference instead of one-off styling.',
    result: 'Editorial now feels like an internal tool for the team building and managing content work.',
    details: [
      'Dashboard copy now focuses on internal editorial workflows.',
      'Template Design System captures reusable visual patterns.',
      'Workflow cards and metrics support source, create, review, and reuse.',
    ],
    accent: 'from-blue-500 via-cyan-400 to-emerald-300',
    panel: 'border-blue-300/25 bg-blue-300/10',
  },
  {
    period: 'Earlier foundation',
    title: 'Source context becomes usable',
    kicker: 'Source Content',
    icon: Layers3,
    commitRefs: ['719a4c6', 'f24d947', '32fdb0d'],
    summary: 'Provider content became richer and easier to review before it powers generation.',
    story: 'A lot of the product depends on source material being trustworthy and easy to inspect. The earlier foundation work improved structured provider rendering, preserved richer body fields, and made source previews more useful before that content flows into generation.',
    result: 'The generation experience now has better source context behind it.',
    details: [
      'Structured provider content renders more cleanly in detail views.',
      'Richer body fields are stored for previews and generation context.',
      'Source previews give generation workflows better grounding.',
    ],
    accent: 'from-emerald-500 via-cyan-400 to-blue-500',
    panel: 'border-emerald-300/25 bg-emerald-300/10',
  },
];

export default function ProductUpdates() {
  const [activeTab, setActiveTab] = useState<ProductUpdateTab>('visual-log');

  return (
    <div className="space-y-4">
      {activeTab === 'change-log' ? (
        <ChangeLog activeTab={activeTab} onTabChange={setActiveTab} />
      ) : (
        <VisualLog activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </div>
  );
}

function ProductUpdateNav({
  activeTab,
  onTabChange,
  tone = 'light',
}: {
  activeTab: ProductUpdateTab;
  onTabChange: (tab: ProductUpdateTab) => void;
  tone?: 'light' | 'dark';
}) {
  const isDark = tone === 'dark';

  return (
    <div className={cn('flex flex-wrap gap-2', isDark && 'text-white')}>
      <Button
        type="button"
        onClick={() => onTabChange('visual-log')}
        className={cn(
          isDark && 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white',
          isDark && activeTab === 'visual-log' && 'bg-white text-slate-950 hover:bg-cyan-50',
        )}
        variant={activeTab === 'visual-log' ? 'default' : 'outline'}
      >
        <Eye className="h-4 w-4" />
        Visual Log
      </Button>
      <Button
        type="button"
        onClick={() => onTabChange('change-log')}
        className={cn(
          isDark && 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white',
          isDark && activeTab === 'change-log' && 'bg-white text-slate-950 hover:bg-cyan-50',
        )}
        variant={activeTab === 'change-log' ? 'default' : 'outline'}
      >
        <ScrollText className="h-4 w-4" />
        Change Log
      </Button>
    </div>
  );
}

function ChangeLog({
  activeTab,
  onTabChange,
}: {
  activeTab: ProductUpdateTab;
  onTabChange: (tab: ProductUpdateTab) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Badge className="mb-3">Product Updates</Badge>
          <p className="text-xs font-semibold uppercase text-primary">Change Log</p>
          <h3 className="text-xl font-semibold">Recent product milestones</h3>
          <div className="mt-2 text-xs text-muted-foreground">Built from GitHub commit history and grouped by completed feature work.</div>
        </div>
        <div className="grid gap-3 sm:min-w-[360px]">
          <ProductUpdateNav activeTab={activeTab} onTabChange={onTabChange} />
          <div className="grid gap-2 sm:grid-cols-3">
            <UpdateStat icon={GitCommit} value="533" label="GitHub commits reviewed" />
            <UpdateStat icon={BadgeCheck} value={String(changelogGroups.length)} label="feature groups" />
            <UpdateStat icon={CalendarDays} value="Daily" label="release dates" />
          </div>
        </div>
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

function ParallaxStorySection({
  stories,
  activeTab,
  onTabChange,
  className,
  showNav = true,
  compact = false,
}: {
  stories: ReleaseStory[];
  activeTab: ProductUpdateTab;
  onTabChange: (tab: ProductUpdateTab) => void;
  className?: string;
  showNav?: boolean;
  compact?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const chapterHeight = compact ? 520 : 720;
  const maxScroll = Math.max((stories.length - 1) * chapterHeight, 1);
  const progress = clamp(scrollTop / maxScroll, 0, 1);
  const activeIndex = clamp(Math.round(scrollTop / chapterHeight), 0, stories.length - 1);
  const activeStory = stories[activeIndex] || stories[0]!;
  const Icon = activeStory.icon;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReduceMotion(media.matches);
    updateMotion();
    media.addEventListener('change', updateMotion);
    return () => media.removeEventListener('change', updateMotion);
  }, []);

  const scrollToStory = (index: number) => {
    scrollRef.current?.scrollTo({
      top: index * chapterHeight,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  const releasePageScroll = (event: WheelEvent<HTMLDivElement>) => {
    if (!compact) return;

    const scroller = event.currentTarget;
    const maxScrollerTop = scroller.scrollHeight - scroller.clientHeight;
    const atTop = scroller.scrollTop <= 1;
    const atBottom = scroller.scrollTop >= maxScrollerTop - 1;
    const shouldRelease = (event.deltaY > 0 && atBottom) || (event.deltaY < 0 && atTop);

    if (!shouldRelease) return;

    const pageScroller = scroller.closest('main');
    if (!pageScroller) return;

    event.preventDefault();
    pageScroller.scrollBy({ top: event.deltaY, behavior: 'auto' });
  };

  const parallaxStyle = (transform: string, extra?: CSSProperties): CSSProperties | undefined => {
    if (reduceMotion) return extra;
    return {
      ...extra,
      transform,
    };
  };

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-[#020817] text-white shadow-sm',
        compact ? 'h-[620px] min-h-[620px]' : 'h-[calc(100dvh-5.5rem)] min-h-[720px]',
        className
      )}
      onMouseMove={(event) => {
        if (reduceMotion) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setMouse({
          x: (event.clientX - rect.left) / rect.width - 0.5,
          y: (event.clientY - rect.top) / rect.height - 0.5,
        });
      }}
      onMouseLeave={() => setMouse({ x: 0, y: 0 })}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={parallaxStyle(
          compact
            ? `translate3d(${mouse.x * -10}px, ${mouse.y * -10}px, 0) scale(1.04)`
            : `translate3d(${mouse.x * -20}px, ${-scrollTop * 0.05 + mouse.y * -20}px, 0) scale(1.06)`,
          {
            background:
              'radial-gradient(circle at 18% 20%, rgba(34,211,238,.28), transparent 28%), radial-gradient(circle at 78% 30%, rgba(217,70,239,.30), transparent 30%), radial-gradient(circle at 45% 78%, rgba(251,146,60,.18), transparent 30%), linear-gradient(135deg,#061a2e,#17162f 52%,#020817)',
          }
        )}
      />
      <div
        className="pointer-events-none absolute -left-32 top-56 h-[520px] w-[520px] rounded-full border border-cyan-300/20"
        style={parallaxStyle(compact ? 'translateY(0) rotate(0deg)' : `translateY(${-scrollTop * 0.22}px) rotate(${scrollTop * 0.04}deg)`)}
      />
      <div
        className="pointer-events-none absolute -right-44 top-20 h-[680px] w-[680px] rounded-full border border-fuchsia-300/16"
        style={parallaxStyle(compact ? 'translateY(0) rotate(0deg)' : `translateY(${scrollTop * 0.16}px) rotate(${-scrollTop * 0.035}deg)`)}
      />
      <div
        className="pointer-events-none absolute bottom-[-18rem] left-[18%] h-[620px] w-[620px] rounded-full border border-orange-300/12"
        style={parallaxStyle(compact ? 'translate3d(0, 0, 0) rotate(0deg)' : `translate3d(${scrollTop * 0.08}px, ${-scrollTop * 0.18}px, 0) rotate(${scrollTop * 0.025}deg)`)}
      />

      <div
        className={cn(
          'relative z-10 grid h-full min-w-0 grid-cols-1 px-4 sm:px-6',
          compact
            ? 'gap-4 py-3 lg:grid-cols-[350px_minmax(0,1fr)] lg:px-5'
            : 'gap-6 py-5 lg:grid-cols-[430px_minmax(0,1fr)] lg:px-7'
        )}
      >
        <aside
          className={cn(
            'hidden self-start overflow-hidden border border-white/15 bg-white/[0.08] shadow-2xl backdrop-blur-2xl lg:block',
            compact ? 'rounded-3xl p-4' : 'rounded-[28px] p-5'
          )}
        >
          <div className={cn('flex flex-col', compact ? 'gap-3' : 'gap-4')}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">Product Updates</Badge>
                <h3 className={cn('font-semibold leading-tight text-white', compact ? 'mt-3 text-2xl' : 'mt-4 text-3xl')}>Visual release story</h3>
                <p className={cn('text-white/65', compact ? 'mt-2 text-xs leading-5' : 'mt-3 text-sm leading-6')}>
                  Scroll the chapters to review the completed product work as a visual release narrative.
                </p>
              </div>
            </div>
            {showNav ? <ProductUpdateNav activeTab={activeTab} onTabChange={onTabChange} tone="dark" /> : null}

            <div className="grid gap-2">
              <UpdateStat icon={GitCommit} value="533" label="GitHub commits reviewed" tone="dark" />
              <UpdateStat icon={BadgeCheck} value={String(changelogGroups.length)} label="feature groups" tone="dark" />
              <UpdateStat icon={CalendarDays} value="Daily" label="release dates" tone="dark" />
            </div>

            <div
              className={cn(
                'mt-1 rounded-2xl border border-white/12 bg-slate-950/35 transition-transform duration-300',
                compact ? 'p-3' : 'p-4'
              )}
              style={parallaxStyle(`translateY(${-activeIndex * 8}px) scale(${1 + activeIndex * 0.015})`)}
            >
              <div className={cn(`flex items-center justify-center rounded-2xl bg-gradient-to-br ${activeStory.accent}`, compact ? 'mb-3 h-11 w-11' : 'mb-4 h-14 w-14')}>
                <Icon className={compact ? 'h-5 w-5' : 'h-7 w-7'} />
              </div>
              <div className={cn('font-semibold text-cyan-200', compact ? 'text-xs' : 'text-sm')}>{activeStory.kicker}</div>
              <div className={cn('mt-1 font-semibold leading-tight text-white', compact ? 'text-base' : 'text-xl')}>{activeStory.summary}</div>
              <div className={cn('text-xs font-semibold uppercase tracking-wide text-white/50', compact ? 'mt-2' : 'mt-3')}>{activeStory.period}</div>
              <div className={cn('overflow-hidden rounded-full bg-white/10', compact ? 'mt-3 h-1' : 'mt-5 h-1.5')}>
                <div className="h-full rounded-full bg-cyan-300 transition-[width] duration-150" style={{ width: `${Math.max(7, progress * 100)}%` }} />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 pb-1">
              {stories.map((story, index) => (
                <button
                  key={story.title}
                  type="button"
                  onClick={() => scrollToStory(index)}
                  className={cn(
                    'h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                    index === activeIndex ? 'w-12 bg-cyan-300' : 'w-5 bg-white/25 hover:bg-white/40'
                  )}
                  aria-label={`Jump to ${story.title}`}
                />
              ))}
            </div>
          </div>
        </aside>

        <div className={cn('relative min-w-0 overflow-hidden border border-white/10 bg-slate-950/20', compact ? 'rounded-3xl' : 'rounded-[28px]')}>
          <div className="absolute left-0 top-0 z-30 h-1 bg-cyan-300 transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
          <div className="absolute left-4 top-4 z-30 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-semibold text-white/70 backdrop-blur lg:hidden">
            Chapter {activeIndex + 1} / {stories.length}
          </div>
          <div
            ref={scrollRef}
            className="h-full snap-y snap-mandatory overflow-x-hidden overflow-y-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
            onWheel={releasePageScroll}
          >
            <div style={{ height: stories.length * chapterHeight }} className="relative">
              {stories.map((story, index) => {
                const StoryIcon = story.icon;
                const local = clamp((scrollTop - index * chapterHeight) / chapterHeight, -1, 1);
                const distance = Math.abs(local);
                const visibleOpacity = compact
                  ? clamp(1 - distance * 3.4, 0, 1)
                  : clamp(1 - distance * 0.45, 0.18, 1);
                const articleOffset = compact ? local * 165 : local * 90;

                return (
                  <section
                    key={story.title}
                    className={cn(
                      'sticky top-0 flex snap-start items-center justify-center px-4 sm:px-6',
                      compact ? 'h-[620px] py-7 lg:px-6' : 'h-[720px] py-10 lg:px-8'
                    )}
                  >
                    <div
                      className={`pointer-events-none absolute h-80 w-80 rounded-full bg-gradient-to-br ${story.accent} blur-3xl`}
                      style={parallaxStyle(`translate(${local * -180}px, ${local * 220}px)`, { opacity: 0.28 * visibleOpacity })}
                    />
                    <div
                      className="absolute right-8 top-28 hidden h-80 w-48 rounded-[2rem] border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur 2xl:block"
                      style={parallaxStyle(`translateY(${local * -160}px) rotate(${12 + local * 18}deg) scale(${1 - distance * 0.04})`, { opacity: visibleOpacity })}
                    >
                      <div className="h-full rounded-[1.45rem] bg-slate-950 p-3">
                        <div className={`h-28 rounded-2xl bg-gradient-to-br ${story.accent}`} />
                        <div className="mt-4 h-2 w-20 rounded-full bg-white/70" />
                        <div className="mt-3 space-y-2">
                          <div className="h-2 rounded-full bg-white/25" />
                          <div className="h-2 w-4/5 rounded-full bg-white/18" />
                          <div className="h-2 w-2/3 rounded-full bg-white/18" />
                        </div>
                        <div className="mt-8 grid grid-cols-3 gap-2">
                          <div className="h-12 rounded-xl bg-white/10" />
                          <div className="h-12 rounded-xl bg-white/10" />
                          <div className="h-12 rounded-xl bg-white/10" />
                        </div>
                      </div>
                    </div>

                    <article
                      className={cn(
                        'relative w-full border border-white/15 bg-slate-900/78 shadow-2xl backdrop-blur-2xl',
                        compact ? 'max-w-2xl rounded-3xl p-5 md:p-6' : 'max-w-3xl rounded-[30px] p-6 md:p-9'
                      )}
                      style={parallaxStyle(`translateY(${articleOffset}px) scale(${1 - distance * 0.08})`, { opacity: visibleOpacity })}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">{story.kicker}</Badge>
                        <span className="text-sm font-semibold text-cyan-200">Chapter {index + 1} of {stories.length}</span>
                        <span className="text-xs font-semibold uppercase tracking-wide text-white/55">{story.period}</span>
                      </div>
                      <div className={cn(`flex items-center justify-center rounded-2xl bg-gradient-to-br ${story.accent}`, compact ? 'mt-4 h-11 w-11' : 'mt-5 h-14 w-14')}>
                        <StoryIcon className={compact ? 'h-5 w-5' : 'h-7 w-7'} />
                      </div>
                      <h3 className={cn('max-w-2xl font-semibold leading-tight', compact ? 'mt-4 text-2xl sm:text-3xl' : 'mt-5 text-3xl sm:text-4xl xl:text-[2.75rem]')}>{story.title}</h3>
                      <p className={cn('max-w-2xl text-white/80', compact ? 'mt-3 text-sm leading-5' : 'mt-4 text-sm leading-6 sm:text-base')}>{story.story}</p>
                      <div className={cn('rounded-2xl border border-white/12 bg-black/20 text-sm text-white/78', compact ? 'mt-4 p-3 leading-5' : 'mt-5 p-4 leading-6')}>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/55">Editorial result</div>
                        {story.result}
                      </div>
                      <div className={compact ? 'mt-4' : 'mt-5'}>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">What changed</div>
                        <ul className={cn('grid gap-2 text-sm text-white/76', compact ? 'leading-4' : 'leading-5')}>
                          {story.details.map((detail) => (
                            <li key={detail} className={cn('flex gap-2 rounded-2xl border border-white/10 bg-white/[0.06]', compact ? 'p-2.5' : 'p-3')}>
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className={cn('flex flex-wrap gap-1.5', compact ? 'mt-4' : 'mt-5')}>
                        {story.commitRefs.map((commit) => (
                          <Badge key={commit} variant="outline" className="border-white/20 bg-black/20 font-mono text-[11px] text-white">
                            {commit}
                          </Badge>
                        ))}
                      </div>
                    </article>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function VisualLogFallback({
  stories,
  activeTab,
  onTabChange,
}: {
  stories: ReleaseStory[];
  activeTab: ProductUpdateTab;
  onTabChange: (tab: ProductUpdateTab) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-slate-950 p-5 text-white shadow-sm">
      <div className="mb-4 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">Product Updates</Badge>
            <h3 className="mt-3 text-3xl font-semibold">Product story</h3>
          </div>
          <ProductUpdateNav activeTab={activeTab} onTabChange={onTabChange} tone="dark" />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <UpdateStat icon={GitCommit} value="30" label="recent commits reviewed" tone="dark" />
          <UpdateStat icon={BadgeCheck} value="5" label="release groups" tone="dark" />
          <UpdateStat icon={CalendarDays} value="Weekly" label="summary cadence" tone="dark" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {stories.map((story) => {
          const Icon = story.icon;
          return (
            <article key={story.title} className="rounded-2xl border border-white/15 bg-white/[0.08] p-4">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${story.accent}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-xs font-semibold uppercase text-cyan-200">{story.kicker}</div>
              <h4 className="mt-1 text-xl font-semibold">{story.title}</h4>
              <p className="mt-3 text-sm leading-6 text-white/68">{story.story}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function VisualLog({
  activeTab,
  onTabChange,
  className,
  showNav = true,
  compact = false,
}: {
  activeTab: ProductUpdateTab;
  onTabChange: (tab: ProductUpdateTab) => void;
  className?: string;
  showNav?: boolean;
  compact?: boolean;
}) {
  return (
    <>
      <div className="motion-reduce:hidden">
        <ParallaxStorySection
          stories={releaseStories}
          activeTab={activeTab}
          onTabChange={onTabChange}
          className={className}
          showNav={showNav}
          compact={compact}
        />
      </div>
      <div className="hidden motion-reduce:block">
        <VisualLogFallback stories={releaseStories} activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </>
  );
}

export function ProductUpdatesVisualStory({
  className,
  showNav = true,
  compact = false,
}: {
  className?: string;
  showNav?: boolean;
  compact?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<ProductUpdateTab>('visual-log');

  return activeTab === 'change-log' ? (
    <ChangeLog activeTab={activeTab} onTabChange={setActiveTab} />
  ) : (
    <VisualLog
      activeTab={activeTab}
      onTabChange={setActiveTab}
      className={className}
      showNav={showNav}
      compact={compact}
    />
  );
}

function UpdateStat({
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
  const isDark = tone === 'dark';

  return (
    <div className={cn('rounded-md border p-3', isDark ? 'border-white/12 bg-black/20' : 'border-border bg-card')}>
      <div className="flex items-center gap-3">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', isDark ? 'bg-cyan-300/15 text-cyan-200' : 'bg-primary/10 text-primary')}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className={cn('text-lg font-semibold leading-none', isDark && 'text-white')}>{value}</p>
          <p className={cn('mt-1 text-xs', isDark ? 'text-white/58' : 'text-muted-foreground')}>{label}</p>
        </div>
      </div>
    </div>
  );
}
