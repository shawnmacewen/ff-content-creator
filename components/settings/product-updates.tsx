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
          <div className="mt-2 text-xs text-muted-foreground">Generated from recent repo commit history and grouped for readability.</div>
        </div>
        <div className="grid gap-3 sm:min-w-[360px]">
          <ProductUpdateNav activeTab={activeTab} onTabChange={onTabChange} />
          <div className="grid gap-2 sm:grid-cols-3">
            <UpdateStat icon={GitCommit} value="30" label="commits" />
            <UpdateStat icon={BadgeCheck} value="5" label="groups" />
            <UpdateStat icon={CalendarDays} value="Weekly" label="cadence" />
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
}: {
  stories: ReleaseStory[];
  activeTab: ProductUpdateTab;
  onTabChange: (tab: ProductUpdateTab) => void;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const storyRefs = useRef<Array<HTMLElement | null>>([]);
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
    storyRefs.current[index]?.scrollIntoView({
      block: 'center',
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
    <section ref={sectionRef} className="relative overflow-hidden rounded-lg border border-border bg-slate-950 text-white shadow-sm">
      <div className="pointer-events-none sticky top-0 z-0 -mb-[calc(100dvh-1rem)] h-[calc(100dvh-1rem)] min-h-[560px] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.35),transparent_32%),radial-gradient(circle_at_80%_18%,rgba(168,85,247,0.28),transparent_30%),linear-gradient(180deg,#08111f_0%,#0f172a_45%,#020617_100%)] transition-colors duration-500" />
        <div className={`absolute inset-x-0 top-0 h-72 bg-gradient-to-r ${activeStory.accent} opacity-25 blur-3xl transition-all duration-500`} style={layerStyle(80, -70, 4, 1)} />
        <div className="absolute left-1/2 top-[-14rem] h-[980px] w-[980px] rounded-full border border-white/10 opacity-45" style={layerStyle(-120, 120, -8, 1, 'translateX(-50%)')} />
        <div className="absolute -right-28 top-40 h-80 w-80 rounded-full border border-cyan-300/20" style={layerStyle(-210, 130, 10, 1)} />
        <div className="absolute bottom-[-14rem] left-[-10rem] h-[520px] w-[520px] rounded-full border border-violet-300/15" style={layerStyle(140, -150, -12, 1)} />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">Product Updates</Badge>
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/65">{activeStory.period}</span>
                </div>
                <h3 className="mt-2 text-lg font-semibold leading-tight text-white sm:text-xl">Visual release story</h3>
              </div>
              <ProductUpdateNav activeTab={activeTab} onTabChange={onTabChange} tone="dark" />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <UpdateStat icon={GitCommit} value="30" label="recent commits reviewed" tone="dark" />
              <UpdateStat icon={BadgeCheck} value="5" label="release groups" tone="dark" />
              <UpdateStat icon={CalendarDays} value="Weekly" label="summary cadence" tone="dark" />
            </div>

            <div className="mt-4 rounded-2xl border border-white/12 bg-black/25 p-4">
              <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${activeStory.accent}`}>
                <Icon className="h-7 w-7" />
              </div>
              <div className="text-sm font-semibold text-cyan-200">{activeStory.kicker}</div>
              <div className="mt-1 text-xl font-semibold leading-tight">{activeStory.summary}</div>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-cyan-300 transition-[width] duration-150" style={{ width: `${Math.max(7, chapterProgress * 100)}%` }} />
              </div>
            </div>

            <div className="mt-4 flex shrink-0 items-center gap-2 pb-1">
              {stories.map((story, index) => (
                <button
                  key={story.title}
                  type="button"
                  onClick={() => scrollToStory(index)}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    index === activeIndex ? 'w-12 bg-cyan-300' : 'w-5 bg-white/25 hover:bg-white/40'
                  )}
                  aria-label={`Jump to ${story.title}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8 pb-8">
          {stories.map((story, index) => {
            const StoryIcon = story.icon;
            return (
              <article
                key={story.title}
                ref={(node) => {
                  storyRefs.current[index] = node;
                }}
                className={cn('scroll-mt-8 rounded-3xl border p-5 shadow-2xl backdrop-blur-xl sm:p-6 lg:min-h-[calc(100dvh-6rem)]', story.panel)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">{story.kicker}</Badge>
                  <span className="text-sm font-semibold text-cyan-200">Chapter {index + 1} of {stories.length}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/55">{story.period}</span>
                </div>
                <div className={`mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${story.accent}`}>
                  <StoryIcon className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl xl:text-[2.75rem]">{story.title}</h3>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80 sm:text-base">{story.story}</p>
                <div className="mt-5 rounded-2xl border border-white/12 bg-black/20 p-4 text-sm leading-6 text-white/78">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/55">Editorial result</div>
                  {story.result}
                </div>
                <div className="mt-5">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">What changed</div>
                  <ul className="grid gap-2 text-sm leading-5 text-white/76">
                    {story.details.map((detail) => (
                      <li key={detail} className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {story.commitRefs.map((commit) => (
                    <Badge key={commit} variant="outline" className="border-white/20 bg-black/20 font-mono text-[11px] text-white">
                      {commit}
                    </Badge>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <div className="pointer-events-none absolute bottom-10 right-8 z-0 hidden w-[44%] [perspective:1200px] lg:block">
          <div className="relative min-h-[470px]">
            <div className="absolute left-4 top-4 h-64 w-48 rounded-3xl border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-xl [transform-style:preserve-3d] xl:h-72 xl:w-56" style={layerStyle(-70, -120, -8, 1, 'rotate(-10deg)')}>
              <div className="h-full rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-400 to-emerald-300 p-4">
                <DatabaseZap className="h-8 w-8 text-white" />
                <div className="mt-20 text-lg font-semibold xl:mt-24 xl:text-xl">Source intelligence</div>
                <div className="mt-2 text-xs leading-5 text-white/75">Richer source context powers review and generation.</div>
              </div>
            </div>

            <div className="absolute left-20 top-20 h-72 w-56 rounded-3xl border border-white/20 bg-white/15 p-3 shadow-2xl backdrop-blur-xl xl:left-24 xl:top-24 xl:h-[20rem] xl:w-64" style={layerStyle(40, -70, 5, 1.02, 'rotate(4deg)')}>
              <div className="h-full rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-sky-400 p-4">
                <WandSparkles className="h-8 w-8 text-white" />
                <div className="mt-28 text-lg font-semibold xl:mt-32 xl:text-xl">Generation flow</div>
                <div className="mt-2 text-xs leading-5 text-white/75">Outputs show progress, counts, and context.</div>
              </div>
            </div>

            <div className="absolute right-4 top-48 h-56 w-48 rounded-3xl border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-xl xl:top-56 xl:h-60 xl:w-52" style={layerStyle(-120, 70, 12, 1, 'rotate(12deg)')}>
              <div className="h-full rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-600 to-cyan-400 p-4">
                <Images className="h-8 w-8 text-white" />
                <div className="mt-16 text-lg font-semibold xl:mt-20">Visual preview</div>
                <div className="mt-2 text-xs leading-5 text-white/75">Carousel work is reviewed in a social frame.</div>
              </div>
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
}: {
  activeTab: ProductUpdateTab;
  onTabChange: (tab: ProductUpdateTab) => void;
}) {
  return (
    <>
      <div className="motion-reduce:hidden">
        <ParallaxStorySection stories={releaseStories} activeTab={activeTab} onTabChange={onTabChange} />
      </div>
      <div className="hidden motion-reduce:block">
        <VisualLogFallback stories={releaseStories} activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </>
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
