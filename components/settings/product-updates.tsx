'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

type ScrollRoot = HTMLElement | Window;

function isWindowRoot(root: ScrollRoot): root is Window {
  return root === window;
}

function getScrollRoot(section: HTMLElement | null): ScrollRoot {
  let node = section?.parentElement || null;

  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = `${style.overflowY} ${style.overflow}`;
    if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }

  return window;
}

function getScrollViewport(root: ScrollRoot) {
  if (isWindowRoot(root)) {
    return {
      top: 0,
      height: window.innerHeight,
    };
  }

  const rect = root.getBoundingClientRect();
  return {
    top: rect.top,
    height: root.clientHeight,
  };
}

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

const releaseStories: ReleaseStory[] = [
  {
    period: 'Week of May 27',
    title: 'Instagram Preview becomes the stage',
    kicker: 'Carousel',
    icon: Smartphone,
    commitRefs: ['355b2cc', 'a1d0eac', '77733ad'],
    summary: 'The carousel output moved from a utility preview into a richer Instagram-style review surface.',
    story: 'The team needed to judge carousel work in the context where it will actually live. We renamed the view, made it the default, centered the swipe surface, and added an AI-generated backdrop that borrows the visual language of the carousel itself.',
    result: 'Generated carousel assets now feel reviewable as a social post, not just as isolated image files.',
    details: [
      'Default output view is now Instagram Preview.',
      'The phone mockup uses a generated ambient background when available.',
      'Swipe framing keeps the active square centered without slide bleed.',
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
    story: 'Every meaningful generation event now writes into Supabase. Content generation, EchoWrite, carousel captions, and image generation each contribute to a more accurate picture of editorial throughput.',
    result: 'The dashboard can now show how much work the platform is helping the team produce during testing and beyond.',
    details: [
      'Generated assets are backed by generation events.',
      'Generated images are tracked separately from written content.',
      'Large output-area progress states make work-in-progress visible.',
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
    story: 'Labels were showing up in different places with different visual treatments. We centralized the color mapping, then added Tag Explorer so the team can see which tags are used, where cleanup is needed, and which source content belongs to a tag.',
    result: 'The content library is easier to scan and the team now has a path toward tag governance.',
    details: [
      'Content designations and tags share consistent color logic.',
      'Tag Explorer shows counts, single-use tags, and case variants.',
      'Tag rows link back into Source Content filtered by tag.',
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
    story: 'The product needed to stop speaking to marketers, advisors, and compliance teams as end users. The dashboard now frames the workspace around editorial production, source review, reusable content, and operational momentum.',
    result: 'Editorial now feels like an internal tool for the team building and managing content work.',
    details: [
      'Dashboard copy is focused on internal editorial workflows.',
      'Template Design System captures the shared visual direction.',
      'Workflow cards and metrics now support source, create, review, and reuse.',
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
    story: 'The source detail work improved how structured provider bodies render, stored richer body fields, and made source previews more useful for generation and review.',
    result: 'The generation experience now has better source context behind it.',
    details: [
      'Structured source content renders more cleanly.',
      'Richer body fields are stored for detail and preview surfaces.',
      'Source previews are more useful in the generation workflow.',
    ],
    accent: 'from-emerald-500 via-cyan-400 to-blue-500',
    panel: 'border-emerald-300/25 bg-emerald-300/10',
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

function ParallaxStorySection({ stories }: { stories: ReleaseStory[] }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const activeIndex = Math.min(stories.length - 1, Math.floor(progress * stories.length));
  const activeStory = stories[activeIndex] || stories[0]!;
  const Icon = activeStory.icon;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReduceMotion(media.matches);
    updateMotion();
    media.addEventListener('change', updateMotion);
    return () => media.removeEventListener('change', updateMotion);
  }, []);

  useEffect(() => {
    let frame = 0;
    const root = getScrollRoot(sectionRef.current);

    const update = () => {
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const viewport = getScrollViewport(root);
      const top = rect.top - viewport.top;
      const scrollable = Math.max(rect.height - viewport.height, 1);
      const next = Math.min(Math.max(-top / scrollable, 0), 0.999);
      setProgress(next);
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    root.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const scrollToStory = (index: number) => {
    const section = sectionRef.current;
    if (!section) return;

    const root = getScrollRoot(section);
    const viewport = getScrollViewport(root);
    const rect = section.getBoundingClientRect();
    const top = rect.top - viewport.top;
    const scrollable = Math.max(rect.height - viewport.height, 1);
    const target = (index / stories.length) * scrollable;

    if (isWindowRoot(root)) {
      window.scrollTo({
        top: window.scrollY + top + target,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
      return;
    }

    root.scrollTo({
      top: root.scrollTop + top + target,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  const layerStyle = (x: number, y: number, rotate = 0, scale = 1, baseTransform = '') => {
    if (reduceMotion) return undefined;
    return {
      transform: `${baseTransform} translate3d(${progress * x}px, ${progress * y}px, 0) rotate(${progress * rotate}deg) scale(${scale + progress * 0.08})`,
    };
  };

  const chapterProgress = useMemo(() => {
    const segmentStart = activeIndex / stories.length;
    const segmentSize = 1 / stories.length;
    return Math.min(Math.max((progress - segmentStart) / segmentSize, 0), 1);
  }, [activeIndex, progress, stories.length]);

  return (
    <section ref={sectionRef} className="relative min-h-[420vh] overflow-visible rounded-lg border border-border bg-slate-950 text-white shadow-sm">
      <div className="sticky top-0 min-h-screen overflow-hidden px-4 py-6 sm:px-7 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.35),transparent_32%),radial-gradient(circle_at_80%_18%,rgba(168,85,247,0.28),transparent_30%),linear-gradient(180deg,#08111f_0%,#0f172a_45%,#020617_100%)] transition-colors duration-500" />
        <div className={`absolute inset-x-0 top-0 h-72 bg-gradient-to-r ${activeStory.accent} opacity-25 blur-3xl transition-all duration-500`} style={layerStyle(80, -70, 4, 1)} />
        <div className="absolute left-1/2 top-[-14rem] h-[980px] w-[980px] rounded-full border border-white/10 opacity-45" style={layerStyle(-120, 120, -8, 1, 'translateX(-50%)')} />
        <div className="absolute -right-28 top-40 h-80 w-80 rounded-full border border-cyan-300/20" style={layerStyle(-210, 130, 10, 1)} />
        <div className="absolute bottom-[-14rem] left-[-10rem] h-[520px] w-[520px] rounded-full border border-violet-300/15" style={layerStyle(140, -150, -12, 1)} />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/75 backdrop-blur">
            <span>Visual Log - product update story</span>
            <span>{activeStory.period}</span>
          </div>

          <div className="grid flex-1 items-center gap-7 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="max-w-xl">
              <Badge className="mb-4 border-white/20 bg-white/10 text-white hover:bg-white/10">{activeStory.kicker}</Badge>
              <div className="text-sm font-semibold text-cyan-200">Chapter {activeIndex + 1} of {stories.length}</div>
              <h3 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">{activeStory.title}</h3>
              <p className="mt-5 text-base leading-7 text-white/76">{activeStory.story}</p>
              <div className={cn('mt-5 rounded-2xl border p-4 text-sm leading-6 text-white/78 backdrop-blur', activeStory.panel)}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/55">Editorial result</div>
                {activeStory.result}
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {activeStory.commitRefs.map((commit) => (
                  <Badge key={commit} variant="outline" className="border-white/20 bg-black/20 font-mono text-[11px] text-white">
                    {commit}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="relative min-h-[560px] [perspective:1200px]">
              <div className="absolute left-4 top-4 h-80 w-60 rounded-3xl border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-xl [transform-style:preserve-3d]" style={layerStyle(-70, -120, -8, 1, 'rotate(-10deg)')}>
                <div className="h-full rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-400 to-emerald-300 p-4">
                  <DatabaseZap className="h-8 w-8 text-white" />
                  <div className="mt-28 text-xl font-semibold">Source intelligence</div>
                  <div className="mt-2 text-xs leading-5 text-white/75">Richer source context powers review and generation.</div>
                </div>
              </div>
              <div className="absolute left-24 top-28 h-[22rem] w-64 rounded-3xl border border-white/20 bg-white/15 p-3 shadow-2xl backdrop-blur-xl" style={layerStyle(40, -70, 5, 1.02, 'rotate(4deg)')}>
                <div className="h-full rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-sky-400 p-4">
                  <WandSparkles className="h-8 w-8 text-white" />
                  <div className="mt-36 text-xl font-semibold">Generation flow</div>
                  <div className="mt-2 text-xs leading-5 text-white/75">Outputs show progress, counts, and context.</div>
                </div>
              </div>
              <div className="absolute right-4 top-64 h-64 w-56 rounded-3xl border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-xl" style={layerStyle(-120, 70, 12, 1, 'rotate(12deg)')}>
                <div className="h-full rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-600 to-cyan-400 p-4">
                  <Images className="h-8 w-8 text-white" />
                  <div className="mt-20 text-lg font-semibold">Visual preview</div>
                  <div className="mt-2 text-xs leading-5 text-white/75">Carousel work is reviewed in a social frame.</div>
                </div>
              </div>
              <div className="absolute right-20 top-14 w-72 rounded-3xl border border-white/15 bg-black/35 p-5 shadow-2xl backdrop-blur-xl" style={layerStyle(100, 110, -4, 1)}>
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${activeStory.accent}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <div className="text-sm font-semibold text-cyan-200">{activeStory.kicker}</div>
                <div className="mt-1 text-xl font-semibold leading-tight">{activeStory.summary}</div>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-300 transition-[width] duration-150" style={{ width: `${Math.max(7, chapterProgress * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-3 mt-auto grid gap-3 md:grid-cols-3">
            {activeStory.details.map((detail, index) => (
              <div key={detail} className="rounded-2xl border border-white/12 bg-white/[0.07] p-4 text-sm leading-6 text-white/72 backdrop-blur">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">Detail {index + 1}</div>
                {detail}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pb-1">
            {stories.map((story, index) => (
              <button
                key={story.title}
                type="button"
                onClick={() => scrollToStory(index)}
                className={cn(
                  'h-2 rounded-full transition-all',
                  index === activeIndex ? 'w-12 bg-cyan-300' : 'w-5 bg-white/25 hover:bg-white/40'
                )}
                aria-label={`Jump indicator for ${story.title}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function VisualLogFallback({ stories }: { stories: ReleaseStory[] }) {
  return (
    <section className="rounded-lg border border-border bg-slate-950 p-5 text-white shadow-sm">
      <div className="mb-4">
        <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">Visual Log</Badge>
        <h3 className="mt-3 text-3xl font-semibold">Product story</h3>
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

function VisualLog() {
  return (
    <>
      <div className="motion-reduce:hidden">
        <ParallaxStorySection stories={releaseStories} />
      </div>
      <div className="hidden motion-reduce:block">
        <VisualLogFallback stories={releaseStories} />
      </div>
    </>
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
