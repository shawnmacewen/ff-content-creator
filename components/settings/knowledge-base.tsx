'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Compass,
  FileText,
  FolderOpen,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  Library,
  Lightbulb,
  ListChecks,
  PenSquare,
  Route,
  Search,
  SearchCheck,
  Settings2,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { HelpChat } from './help-chat';
import {
  carouselNotes,
  doDontRules,
  formatGuides,
  glossaryItems,
  helpGuides,
  quickAnswers,
  taskEntryPoints,
  troubleshootingItems,
  workflowRecipes,
  type HelpGuide,
  type HelpIcon,
} from '@/lib/help-center-content';

type Icon = ComponentType<{ className?: string }>;

const iconMap: Record<HelpIcon, Icon> = {
  alert: AlertTriangle,
  book: BookOpenCheck,
  dashboard: LayoutDashboard,
  folder: FolderOpen,
  image: ImageIcon,
  library: Library,
  pen: PenSquare,
  route: Route,
  scan: SearchCheck,
  settings: Settings2,
  sparkles: Sparkles,
  wrench: Wrench,
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function termsMatch(values: string[], query: string) {
  if (!query) return true;

  const haystack = values.join(' ').toLowerCase();
  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function guideMatches(guide: HelpGuide, query: string) {
  return termsMatch(
    [
      guide.title,
      guide.eyebrow,
      guide.description,
      ...guide.bestFor,
      ...guide.steps,
      ...guide.tips,
      ...guide.keywords,
    ],
    query
  );
}

function guideHash(id: string) {
  return `guide-${id}`;
}

export default function KnowledgeBase() {
  const [query, setQuery] = useState('');
  const [activeGuideId, setActiveGuideId] = useState(helpGuides[0].id);
  const normalizedQuery = normalize(query);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash.replace(/^#/, '');
    if (!hash.startsWith('guide-')) return;

    const guideId = hash.replace(/^guide-/, '');
    if (helpGuides.some((guide) => guide.id === guideId)) {
      setActiveGuideId(guideId);
    }
  }, []);

  const filteredGuides = useMemo(
    () => helpGuides.filter((guide) => guideMatches(guide, normalizedQuery)),
    [normalizedQuery]
  );

  const activeGuide = useMemo(() => {
    const selectedGuide = helpGuides.find((guide) => guide.id === activeGuideId);
    if (!normalizedQuery) return selectedGuide || helpGuides[0];
    if (selectedGuide && filteredGuides.some((guide) => guide.id === selectedGuide.id)) {
      return selectedGuide;
    }
    return filteredGuides[0] || null;
  }, [activeGuideId, filteredGuides, normalizedQuery]);

  const filteredTaskEntryPoints = useMemo(
    () =>
      taskEntryPoints.filter((item) =>
        termsMatch([item.title, item.description, ...item.steps, ...item.keywords], normalizedQuery)
      ),
    [normalizedQuery]
  );

  const filteredQuickAnswers = useMemo(
    () =>
      quickAnswers.filter((item) =>
        termsMatch([item.question, item.answer], normalizedQuery)
      ),
    [normalizedQuery]
  );

  const filteredFormatGuides = useMemo(
    () =>
      formatGuides.filter((format) =>
        termsMatch(
          [format.title, format.useWhen, ...format.inputs, ...format.outputCheck, ...format.keywords],
          normalizedQuery
        )
      ),
    [normalizedQuery]
  );

  const filteredRecipes = useMemo(
    () =>
      workflowRecipes.filter((recipe) =>
        termsMatch(
          [recipe.title, recipe.outcome, ...recipe.path, ...recipe.notes, ...recipe.keywords],
          normalizedQuery
        )
      ),
    [normalizedQuery]
  );

  const filteredTroubleshootingItems = useMemo(
    () =>
      troubleshootingItems.filter((item) =>
        termsMatch([item.problem, item.check, item.fix, ...item.keywords], normalizedQuery)
      ),
    [normalizedQuery]
  );

  const filteredGlossaryItems = useMemo(
    () =>
      glossaryItems.filter((item) =>
        termsMatch([item.term, item.definition, ...item.keywords], normalizedQuery)
      ),
    [normalizedQuery]
  );

  const selectGuide = (guideId: string) => {
    setActiveGuideId(guideId);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${guideHash(guideId)}`);
    }
  };

  const openTaskGuide = (guideId: string) => {
    selectGuide(guideId);
    const target = document.getElementById('tool-guides');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const ActiveIcon = activeGuide ? iconMap[activeGuide.icon] : HelpCircle;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Team help center"
        title="Knowledge Center"
        description="Search practical guidance for the tools the internal curation team uses to find, update, create, review, and reuse advisor content."
        metrics={[
          {
            label: `${helpGuides.length} tool guides`,
            detail: 'Task paths, formats, glossary, and troubleshooting.',
            icon: BookOpenCheck,
          },
          {
            label: 'Deep-linkable guides',
            detail: 'Selections update the URL hash.',
            icon: HelpCircle,
            iconClassName: 'bg-secondary text-primary',
          },
        ]}
      />

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

      <HelpChat />

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase text-primary">Getting Started</p>
          <h3 className="text-xl font-semibold">Choose the job you need to do</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {filteredTaskEntryPoints.length ? (
            filteredTaskEntryPoints.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => openTaskGuide(entry.guideId)}
                className="rounded-md border border-border bg-background p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <h4 className="text-sm font-semibold">{entry.title}</h4>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{entry.description}</p>
                <div className="mt-3 space-y-1.5">
                  {entry.steps.map((step) => (
                    <div key={step} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground md:col-span-2 xl:col-span-5">
              No getting-started paths match that search.
            </div>
          )}
        </div>
      </section>

      <section id="tool-guides" className="grid scroll-mt-6 gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase text-primary">Tool Guides</p>
            <h3 className="text-lg font-semibold">Main navigation help</h3>
          </div>
          <div className="grid gap-2">
            {filteredGuides.length ? (
              filteredGuides.map((guide) => {
                const GuideIcon = iconMap[guide.icon];
                const active = guide.id === activeGuide?.id;

                return (
                  <button
                    key={guide.id}
                    id={guideHash(guide.id)}
                    type="button"
                    onClick={() => selectGuide(guide.id)}
                    className={`flex scroll-mt-6 items-center gap-3 rounded-md border p-3 text-left transition-colors ${
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
                No guide matches that search.
              </div>
            )}
          </div>
        </div>

        <article className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          {activeGuide ? (
            <>
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
            </>
          ) : (
            <div className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
              Search did not match any tool guide. Try a broader task like source, generate, scan, sync, or saved.
            </div>
          )}
        </article>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase text-primary">Generate Formats</p>
          <h3 className="text-xl font-semibold">Format-specific help</h3>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredFormatGuides.length ? (
            filteredFormatGuides.map((format) => (
              <div key={format.title} className="rounded-md border border-border bg-background p-4">
                <div className="mb-3 flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold">{format.title}</h4>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{format.useWhen}</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase text-foreground">Good Inputs</div>
                    <ul className="space-y-1.5 text-xs leading-5 text-muted-foreground">
                      {format.inputs.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase text-foreground">Output Check</div>
                    <ul className="space-y-1.5 text-xs leading-5 text-muted-foreground">
                      {format.outputCheck.map((item) => (
                        <li key={item} className="flex gap-2">
                          <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground xl:col-span-2">
              No format guides match that search.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase text-primary">Quick Answers</p>
          <h3 className="text-xl font-semibold">Common team questions</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {filteredQuickAnswers.length ? (
            filteredQuickAnswers.map((item) => (
              <div key={item.question} className="rounded-md border border-border bg-background p-4">
                <h4 className="text-sm font-semibold">{item.question}</h4>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground md:col-span-2">
              No quick answers match that search.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase text-primary">Do / Do Not</p>
          <h3 className="text-xl font-semibold">Operational guardrails</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {doDontRules.map((rule) => (
            <div key={rule.title} className="rounded-md border border-border bg-background p-4">
              <h4 className="text-sm font-semibold">{rule.title}</h4>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {rule.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    {rule.title === 'Do' ? (
                      <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                    )}
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase text-primary">Workflow Playbooks</p>
          <h3 className="text-xl font-semibold">Common jobs from start to finish</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            These playbooks connect multiple tools into the real work patterns the internal
            content team is likely to repeat.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredRecipes.length ? (
            filteredRecipes.map((recipe) => (
              <div key={recipe.title} className="rounded-md border border-border bg-background p-4">
                <div className="mb-3 flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Route className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold">{recipe.title}</h4>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{recipe.outcome}</p>
                  </div>
                </div>
                <ol className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {recipe.path.map((step, index) => (
                    <li key={step} className="flex gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-foreground">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 rounded-md bg-secondary/45 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <Lightbulb className="h-3.5 w-3.5 text-primary" />
                    Notes
                  </div>
                  <ul className="space-y-1.5 text-xs leading-5 text-muted-foreground">
                    {recipe.notes.map((note) => (
                      <li key={note} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground xl:col-span-2">
              No workflow playbooks match that search.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase text-primary">Troubleshooting</p>
          <h3 className="text-xl font-semibold">When something does not look right</h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredTroubleshootingItems.length ? (
            filteredTroubleshootingItems.map((item) => (
              <div key={item.problem} className="rounded-md border border-border bg-background p-4">
                <div className="mb-3 flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <h4 className="text-sm font-semibold">{item.problem}</h4>
                </div>
                <div className="grid gap-3 text-sm leading-6 text-muted-foreground">
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-foreground">
                      <Search className="h-3.5 w-3.5 text-primary" />
                      Check
                    </div>
                    <p>{item.check}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-foreground">
                      <Wrench className="h-3.5 w-3.5 text-primary" />
                      Fix
                    </div>
                    <p>{item.fix}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground lg:col-span-2">
              No troubleshooting entries match that search.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase text-primary">Glossary</p>
          <h3 className="text-xl font-semibold">Shared language</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {filteredGlossaryItems.length ? (
            filteredGlossaryItems.map((item) => (
              <div key={item.term} className="rounded-md border border-border bg-background p-4">
                <h4 className="text-sm font-semibold">{item.term}</h4>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.definition}</p>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground md:col-span-2 xl:col-span-4">
              No glossary terms match that search.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <details>
          <summary className="cursor-pointer list-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">Advanced Reference</p>
                <h3 className="text-xl font-semibold">Instagram Carousel 2.0 generation notes</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Advanced tuning and debugging notes are separated from normal user help.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/settings?tab=instagram-carousel-2">
                  Open Carousel 2.0
                  <ImageIcon className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </summary>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
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
        </details>
      </section>
    </div>
  );
}
