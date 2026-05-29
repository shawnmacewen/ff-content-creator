'use client';

import * as React from 'react';
import useSWR from 'swr';
import {
  BadgeCheck,
  BookOpenCheck,
  Check,
  ClipboardList,
  ExternalLink,
  FileText,
  Filter,
  GraduationCap,
  Loader2,
  Save,
  Search,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { tagLabelClass } from '@/lib/content-label-colors';
import type { SourceContent } from '@/lib/types/content';
import { cn } from '@/lib/utils';

type SourceContentResponse = {
  data: SourceContent[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage?: boolean;
};

type FilterResponse = {
  availableTags: string[];
  availableTypes: string[];
  availableAuthors: string[];
  availablePublishers: string[];
};

type CourseDraft = {
  title: string;
  objective: string;
  description?: string;
  theme?: string;
  readingListSummary?: string;
  coreThemes?: string[];
  questionCount: number;
  passingScore: number;
  completionNotes: string;
  questions: DraftQuestion[];
};

type DraftQuestion = {
  id: string;
  sourceId: string;
  sourceTitle: string;
  question: string;
  choices: string[];
  answerIndex: number;
  citation: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium';
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed with status ${response.status}`);
  return body;
};

const themeSuggestions = [
  'Bonds',
  '529 Plans',
  'Homeowners Insurance',
  'Retirement',
  'Estate Planning',
  'Tax Planning',
  'Long-Term Care',
  'Market Volatility',
];

function decodeLite(value: string) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function formatDate(value?: string) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

function getPrimaryTag(source: SourceContent) {
  return decodeLite(source.tags?.[0] || source.type || 'Source');
}

function getSourceBody(source: SourceContent) {
  return source.bodyText || source.body || source.excerpt || '';
}

function getSourceCategories(source: SourceContent) {
  const meta = source.metadata || {};
  const categories = [
    ...(Array.isArray(meta.categories) ? meta.categories : []),
    ...(Array.isArray(meta.subCategories) ? meta.subCategories : []),
    ...(source.tags || []),
  ];
  return Array.from(new Set(categories.map((item) => decodeLite(String(item))).filter(Boolean))).slice(0, 6);
}

function clampQuestionCount(sourceCount: number) {
  return Math.min(25, Math.max(10, sourceCount * 5));
}

function chooseTheme(sources: SourceContent[]) {
  const tagCounts = new Map<string, number>();
  for (const source of sources) {
    for (const tag of getSourceCategories(source)) {
      const normalized = tag.trim();
      if (!normalized) continue;
      tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
    }
  }

  const [top] = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);
  return top?.[0] || getPrimaryTag(sources[0]) || 'Selected Source Content';
}

function buildCourseDraft(sources: SourceContent[]): CourseDraft | null {
  if (!sources.length) return null;

  const theme = chooseTheme(sources);
  const questionCount = clampQuestionCount(sources.length);
  const questions: DraftQuestion[] = Array.from({ length: questionCount }, (_, index) => {
    const source = sources[index % sources.length];
    const sourceTitle = decodeLite(source.title || 'Selected article');
    const citation = `${sourceTitle}${source.publisher ? `, ${source.publisher}` : ''}`;

    return {
      id: `q-${index + 1}`,
      sourceId: source.id,
      sourceTitle,
      question: `Which takeaway from "${sourceTitle}" should a learner understand after reviewing the material?`,
      choices: [
        'The core planning consideration described in the source material.',
        'A detail that is unrelated to the selected reading list.',
        'A conclusion that contradicts the source material.',
        'A compliance shortcut that the course does not recommend.',
      ],
      answerIndex: 0,
      citation,
      explanation: 'This draft placeholder should be replaced by generated source-grounded rationale.',
      difficulty: 'easy',
    };
  });

  return {
    title: `${theme} CE Course`,
    objective: `Help learners understand key planning considerations, common client questions, and practical advisor talking points related to ${theme}.`,
    description: `A CE course package based on ${sources.length} selected Forefield source ${sources.length === 1 ? 'article' : 'articles'}.`,
    theme,
    readingListSummary: sources.map((source) => decodeLite(source.title || 'Untitled source')).join('; '),
    coreThemes: [theme],
    questionCount,
    passingScore: 60,
    completionNotes: 'Learners should review the selected reading list, complete the multiple-choice quiz, and meet the passing score before the course package is sent downstream.',
    questions,
  };
}

function normalizeGeneratedDraft(coursePackage: any): CourseDraft {
  const questions = Array.isArray(coursePackage?.questions) ? coursePackage.questions : [];

  return {
    title: String(coursePackage?.title || 'Untitled CE Course'),
    objective: String(coursePackage?.objective || ''),
    description: String(coursePackage?.description || ''),
    theme: String(coursePackage?.theme || ''),
    readingListSummary: String(coursePackage?.readingListSummary || ''),
    coreThemes: Array.isArray(coursePackage?.coreThemes) ? coursePackage.coreThemes.map((item: any) => String(item)).filter(Boolean) : [],
    questionCount: questions.length,
    passingScore: 60,
    completionNotes: String(coursePackage?.completionNotes || ''),
    questions: questions.map((question: any, index: number) => {
      const choices = Array.isArray(question?.choices) ? question.choices : [];
      const labels = ['A', 'B', 'C', 'D'];
      const correctLabel = String(question?.correctChoiceLabel || 'A').toUpperCase();
      const answerIndex = Math.max(0, labels.indexOf(correctLabel));

      return {
        id: String(question?.id || `q-${index + 1}`),
        sourceId: String(question?.sourceId || ''),
        sourceTitle: String(question?.sourceTitle || 'Selected source'),
        question: String(question?.question || ''),
        choices: labels.map((label, choiceIndex) => {
          const choice = choices[choiceIndex];
          return String(choice?.text || choice || `${label}. Review the source material.`);
        }),
        answerIndex,
        citation: String(question?.citation || question?.sourceTitle || 'Selected source'),
        explanation: String(question?.explanation || ''),
        difficulty: question?.difficulty === 'medium' ? 'medium' : 'easy',
      };
    }),
  };
}

function buildApiUrl(query: string, tag: string, page: number) {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (tag && tag !== 'all') params.set('tags', tag);
  params.set('page', String(page));
  params.set('pageSize', '20');
  return `/api/source-content?${params.toString()}`;
}

export default function CeCourseCreatorClient() {
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [tagFiltersOpen, setTagFiltersOpen] = React.useState(true);
  const [selectedTag, setSelectedTag] = React.useState('all');
  const [page, setPage] = React.useState(1);
  const [selectedSources, setSelectedSources] = React.useState<Map<string, SourceContent>>(new Map());
  const [draft, setDraft] = React.useState<CourseDraft | null>(null);
  const [generationError, setGenerationError] = React.useState<string | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = React.useState(false);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data, error, isLoading } = useSWR<SourceContentResponse>(
    buildApiUrl(debouncedQuery, tagFiltersOpen ? selectedTag : 'all', page),
    fetcher,
    { keepPreviousData: true, shouldRetryOnError: false }
  );
  const { data: filterData } = useSWR<FilterResponse>('/api/source-content/filters', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const sources = React.useMemo(() => data?.data || [], [data?.data]);
  const selectedList = Array.from(selectedSources.values());
  const canBuild = selectedList.length >= 1 && selectedList.length <= 5;
  const generatedQuestionCount = clampQuestionCount(selectedList.length);
  const availableTags = React.useMemo(() => {
    const fromFilters = filterData?.availableTags || [];
    const fromSources = sources.flatMap((source) => source.tags || []);
    return Array.from(new Set([...fromFilters, ...fromSources].map((tag) => decodeLite(String(tag))).filter(Boolean))).sort((a, b) => a.localeCompare(b)).slice(0, 80);
  }, [filterData, sources]);

  const toggleSource = (source: SourceContent) => {
    setSelectedSources((current) => {
      const next = new Map(current);
      if (next.has(source.id)) {
        next.delete(source.id);
      } else if (next.size < 5) {
        next.set(source.id, source);
      }
      return next;
    });
    setDraft(null);
  };

  const removeSource = (id: string) => {
    setSelectedSources((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
    setDraft(null);
  };

  const applyTheme = (theme: string) => {
    setQuery(theme);
    setSelectedTag('all');
    setTagFiltersOpen(false);
  };

  const handleBuildDraft = async () => {
    if (!canBuild || isGeneratingDraft) return;

    setGenerationError(null);
    setIsGeneratingDraft(true);
    try {
      const response = await fetch('/api/ce-course/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceContentIds: selectedList.map((source) => source.id) }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Generation failed with status ${response.status}`);
      setDraft(normalizeGeneratedDraft(payload?.coursePackage));
    } catch (error: any) {
      setGenerationError(error?.message || 'Generated package failed; showing local draft shell instead.');
      setDraft(buildCourseDraft(selectedList));
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const updateDraftField = (field: 'title' | 'objective' | 'completionNotes', value: string) => {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  };

  const updateQuestion = (questionId: string, value: string) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        questions: current.questions.map((question) => question.id === questionId ? { ...question, question: value } : question),
      };
    });
  };

  return (
    <main className="space-y-5 p-4 sm:p-6">
      <PageHeader
        eyebrow="CE Course Creator"
        title="Build CE course packages from Forefield content"
        description="Select related source articles, shape a course package, and prepare a quiz draft that can later be saved, edited, and retrieved by downstream systems."
        metrics={[
          {
            label: '1-5 source articles',
            detail: selectedList.length ? `${selectedList.length} selected for this course` : 'Select related reading material',
            icon: FileText,
          },
          {
            label: '10-25 quiz questions',
            detail: selectedList.length ? `${generatedQuestionCount} planned questions at roughly five per article` : 'Question count adjusts to reading load',
            icon: ClipboardList,
            iconClassName: 'bg-cyan-600 text-white',
          },
          {
            label: '60% passing score',
            detail: 'Editable draft package with source citations',
            icon: BadgeCheck,
            iconClassName: 'bg-emerald-600 text-white',
          },
        ]}
        actions={
          <Button
            type="button"
            disabled={!canBuild || isGeneratingDraft}
            onClick={handleBuildDraft}
            className="gap-2"
          >
            {isGeneratingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isGeneratingDraft ? 'Generating Package' : 'Generate Course Package'}
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <section className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="space-y-4 border-b border-border bg-card">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Select Course Sources
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose up to five related Forefield pieces. Use search, themes, and tags to find matching material.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit">
                  {selectedList.length}/5 selected
                </Badge>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search sources by topic, title, keyword, or tag..."
                    className="h-11 pl-10"
                  />
                </div>
                <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Tag filtering</span>
                  <Switch checked={tagFiltersOpen} onCheckedChange={setTagFiltersOpen} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {themeSuggestions.map((theme) => (
                  <Button key={theme} type="button" variant="outline" size="sm" onClick={() => applyTheme(theme)}>
                    {theme}
                  </Button>
                ))}
              </div>

              {tagFiltersOpen ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTag('all');
                      setPage(1);
                    }}
                    className={cn(
                      'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold',
                      selectedTag === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground'
                    )}
                  >
                    All tags
                  </button>
                  {availableTags.slice(0, 36).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSelectedTag(tag);
                        setPage(1);
                      }}
                      className={cn(
                        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold',
                        selectedTag === tag ? 'border-primary bg-primary text-primary-foreground' : cn('bg-background', tagLabelClass(tag))
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              ) : null}
            </CardHeader>

            <CardContent className="p-0">
              {error ? (
                <div className="p-6 text-sm text-destructive">Source content could not be loaded: {error.message}</div>
              ) : null}

              <ScrollArea className="h-[680px]">
                <div className="grid gap-3 p-4">
                  {isLoading ? (
                    [1, 2, 3, 4, 5, 6].map((item) => (
                      <div key={item} className="h-28 animate-pulse rounded-lg border border-border bg-muted" />
                    ))
                  ) : sources.length ? (
                    sources.map((source) => {
                      const selected = selectedSources.has(source.id);
                      const disabled = !selected && selectedSources.size >= 5;
                      const primaryTag = getPrimaryTag(source);
                      const body = getSourceBody(source);

                      return (
                        <article
                          key={source.id}
                          className={cn(
                            'rounded-lg border bg-background p-4 shadow-sm transition-colors',
                            selected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
                            disabled && 'opacity-60'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => toggleSource(source)}
                              className={cn(
                                'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors',
                                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-transparent',
                                disabled && 'cursor-not-allowed'
                              )}
                              aria-label={selected ? 'Remove source' : 'Select source'}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className={cn('max-w-[220px] truncate rounded-full text-[11px]', tagLabelClass(primaryTag))}>
                                  {primaryTag}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{formatDate(source.publishedAt)}</span>
                                {source.publisher ? <span className="text-xs text-muted-foreground">{source.publisher}</span> : null}
                              </div>
                              <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5">
                                {decodeLite(source.title || 'Untitled source')}
                              </h3>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                {decodeLite(source.excerpt || body || 'No excerpt available.')}
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {getSourceCategories(source).slice(0, 4).map((category) => (
                                  <span key={category} className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                                    {category}
                                  </span>
                                ))}
                                <SourceDetailDialog source={source} />
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                      No matching source content found.
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex items-center justify-between border-t border-border p-4">
                <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">Page {page}</span>
                <Button type="button" variant="outline" disabled={!data?.hasNextPage} onClick={() => setPage((value) => value + 1)}>
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          {generationError ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              {generationError}
            </div>
          ) : null}
          <SelectedSourcesCard selectedSources={selectedList} onRemove={removeSource} onBuild={handleBuildDraft} canBuild={canBuild} isGenerating={isGeneratingDraft} />
          <CourseDraftCard draft={draft} selectedSources={selectedList} onBuild={handleBuildDraft} onUpdateField={updateDraftField} onUpdateQuestion={updateQuestion} isGenerating={isGeneratingDraft} />
        </aside>
      </div>
    </main>
  );
}

function SourceDetailDialog({ source }: { source: SourceContent }) {
  const body = decodeLite(getSourceBody(source) || 'No body text available for this source.');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs">
          <ExternalLink className="h-3.5 w-3.5" />
          View details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none overflow-hidden p-0 sm:max-w-[min(820px,calc(100vw-2rem))]">
        <DialogHeader className="border-b border-border bg-card px-6 py-5 pr-12 text-left">
          <DialogTitle>{decodeLite(source.title || 'Source detail')}</DialogTitle>
          <DialogDescription className="mt-2">
            {source.publisher || source.author || 'Forefield source'} - {formatDate(source.publishedAt)}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(100vh-10rem)]">
          <div className="space-y-4 px-6 py-5">
            <div className="flex flex-wrap gap-2">
              {getSourceCategories(source).map((category) => (
                <Badge key={category} variant="outline" className={tagLabelClass(category)}>
                  {category}
                </Badge>
              ))}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{body}</p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SelectedSourcesCard({
  selectedSources,
  canBuild,
  isGenerating,
  onRemove,
  onBuild,
}: {
  selectedSources: SourceContent[];
  canBuild: boolean;
  isGenerating: boolean;
  onRemove: (id: string) => void;
  onBuild: () => void | Promise<void>;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base">Course Reading List</CardTitle>
        <p className="text-sm text-muted-foreground">Select 1 to 5 sources. Related source themes make stronger CE packages.</p>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {selectedSources.length ? (
          selectedSources.map((source, index) => (
            <div key={source.id} className="flex items-start gap-3 rounded-md border border-border bg-background p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-sm font-semibold leading-5">{decodeLite(source.title || 'Untitled source')}</div>
                <div className="mt-1 text-xs text-muted-foreground">{getPrimaryTag(source)} - {formatDate(source.publishedAt)}</div>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(source.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
            Add source articles from the selector to start building a CE package.
          </div>
        )}
        <Button type="button" className="w-full gap-2" disabled={!canBuild || isGenerating} onClick={onBuild}>
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isGenerating ? 'Generating Package' : 'Generate Course Package'}
        </Button>
      </CardContent>
    </Card>
  );
}

function CourseDraftCard({
  draft,
  selectedSources,
  onBuild,
  onUpdateField,
  onUpdateQuestion,
  isGenerating,
}: {
  draft: CourseDraft | null;
  selectedSources: SourceContent[];
  onBuild: () => void | Promise<void>;
  onUpdateField: (field: 'title' | 'objective' | 'completionNotes', value: string) => void;
  onUpdateQuestion: (questionId: string, value: string) => void;
  isGenerating: boolean;
}) {
  if (!draft) {
    return (
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Draft Package</CardTitle>
          <p className="text-sm text-muted-foreground">Build a draft to preview the CE course package fields and editable quiz shell.</p>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Question rule</div>
              <div className="mt-1 text-sm font-semibold">10 minimum, 25 maximum</div>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Passing score</div>
              <div className="mt-1 text-sm font-semibold">60%</div>
            </div>
          </div>
          <Button type="button" variant="outline" className="w-full gap-2" disabled={!selectedSources.length || isGenerating} onClick={onBuild}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
            {isGenerating ? 'Generating Package' : 'Generate Course Package'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpenCheck className="h-5 w-5 text-primary" />
          Editable Course Package
        </CardTitle>
        <p className="text-sm text-muted-foreground">Generated from selected source content. Saving and outbound API retrieval will attach to this structure next.</p>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="course-title">Course title</label>
          <Input id="course-title" value={draft.title} onChange={(event) => onUpdateField('title', event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="course-objective">Learning objective</label>
          <Textarea id="course-objective" value={draft.objective} onChange={(event) => onUpdateField('objective', event.target.value)} className="min-h-24" />
        </div>
        {draft.description || draft.readingListSummary || draft.coreThemes?.length ? (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
            {draft.description ? <p>{draft.description}</p> : null}
            {draft.readingListSummary ? <p className="mt-2">Reading list: {draft.readingListSummary}</p> : null}
            {draft.coreThemes?.length ? <p className="mt-2">Themes: {draft.coreThemes.join(', ')}</p> : null}
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Sources</div>
            <div className="mt-1 text-lg font-semibold">{selectedSources.length}</div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Questions</div>
            <div className="mt-1 text-lg font-semibold">{draft.questionCount}</div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Pass</div>
            <div className="mt-1 text-lg font-semibold">{draft.passingScore}%</div>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="completion-notes">Completion notes</label>
          <Textarea id="completion-notes" value={draft.completionNotes} onChange={(event) => onUpdateField('completionNotes', event.target.value)} className="min-h-24" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Quiz preview</h3>
            <Badge variant="outline">Editable</Badge>
          </div>
          <ScrollArea className="h-[360px] rounded-md border border-border">
            <div className="space-y-3 p-3">
              {draft.questions.slice(0, 10).map((question, index) => (
                <div key={question.id} className="rounded-md border border-border bg-background p-3">
                  <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Question {index + 1} - {question.difficulty || 'easy'} - Citation: {question.citation}
                  </div>
                  <Textarea
                    value={question.question}
                    onChange={(event) => onUpdateQuestion(question.id, event.target.value)}
                    className="min-h-20 text-sm"
                  />
                  <div className="mt-3 grid gap-2">
                    {question.choices.map((choice, choiceIndex) => (
                      <div
                        key={`${question.id}-${choice}`}
                        className={cn(
                          'rounded-md border px-3 py-2 text-xs',
                          choiceIndex === question.answerIndex ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-border bg-muted/30 text-muted-foreground'
                        )}
                      >
                        {String.fromCharCode(65 + choiceIndex)}. {choice}
                      </div>
                    ))}
                  </div>
                  {question.explanation ? (
                    <div className="mt-3 rounded-md bg-muted/40 p-2 text-xs leading-5 text-muted-foreground">
                      {question.explanation}
                    </div>
                  ) : null}
                </div>
              ))}
              {draft.questions.length > 10 ? (
                <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  {draft.questions.length - 10} additional questions are planned for the full generated quiz.
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" className="gap-2" disabled>
            <Save className="h-4 w-4" />
            Save Package
          </Button>
          <Button type="button" variant="outline" className="gap-2" disabled>
            <Send className="h-4 w-4" />
            Send to AdvisorStream
          </Button>
        </div>
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
          Save, quiz generation, and AdvisorStream delivery are intentionally disabled in this first UI slice.
        </div>
      </CardContent>
    </Card>
  );
}
