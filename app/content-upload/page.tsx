'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlignLeft,
  Bold,
  Bookmark,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Database,
  FileText,
  Italic,
  Link2,
  List,
  ListOrdered,
  LockKeyhole,
  Loader2,
  Redo2,
  Save,
  Search,
  Sparkles,
  Tags,
  Type,
  Undo2,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type FilterResponse = {
  availableTags: string[];
  availableTypes: string[];
  availableAuthors: string[];
  availablePublishers: string[];
};

type UploadDraft = {
  title: string;
  summary: string;
  bodyText: string;
  contentDesignation: string;
  type: string;
  tags: string[];
  author: string;
  filename: string;
  publishedAt: string;
  recommendedAudience: string;
  sourceUrl: string;
};

const emptyFilters: FilterResponse = {
  availableTags: [],
  availableTypes: [],
  availableAuthors: [],
  availablePublishers: [],
};

const emptyDraft: UploadDraft = {
  title: '',
  summary: '',
  bodyText: '',
  contentDesignation: '',
  type: '',
  tags: [],
  author: '',
  filename: '',
  publishedAt: new Date().toISOString().slice(0, 10),
  recommendedAudience: '',
  sourceUrl: '',
};

async function readJson(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed with status ${response.status}`);
  return body;
}

function normalizeCompare(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function StepBadge({ step, title, detail, active }: { step: number; title: string; detail: string; active?: boolean }) {
  return (
    <div className="flex min-w-[180px] items-center gap-3">
      <span className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-base font-bold shadow-sm',
        active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600'
      )}>
        {step}
      </span>
      <div className="min-w-0">
        <div className={cn('text-sm font-bold', active ? 'text-blue-700' : 'text-slate-700')}>{title}</div>
        <div className="mt-0.5 text-xs text-slate-500">{detail}</div>
      </div>
    </div>
  );
}

function ContentUploadStepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white px-6 py-4 shadow-sm">
      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(220px,0.85fr)]">
        <StepBadge step={1} title="Paste content" detail="Add your text to scan" active={currentStep === 1} />
        <StepBadge step={2} title="Review details" detail="AI prepares source record" active={currentStep === 2} />
        <StepBadge step={3} title="Save to library" detail="Store and use everywhere" active={currentStep === 3} />
        <div className="flex items-start gap-2 border-l border-slate-200 pl-5 text-xs leading-5 text-slate-500">
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <span>Custom Content follows the same source schema as publisher content.</span>
        </div>
      </div>
    </section>
  );
}

function TagPicker({
  availableTags,
  selectedTags,
  onChange,
}: {
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(selectedTags.map(normalizeCompare));
  const maxSelected = selectedTags.length >= 3;

  const addTag = (tag: string) => {
    if (selectedSet.has(normalizeCompare(tag)) || maxSelected) return;
    onChange([...selectedTags, tag]);
    if (selectedTags.length + 1 >= 3) setOpen(false);
  };

  const removeTag = (tag: string) => {
    onChange(selectedTags.filter((item) => normalizeCompare(item) !== normalizeCompare(tag)));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <Badge key={tag} variant="outline" className="gap-1 rounded-md border-blue-200 bg-blue-50 text-blue-700">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`} className="rounded-sm text-blue-600 hover:text-blue-900">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {!selectedTags.length ? <span className="text-sm text-slate-500">Select at least one tag.</span> : null}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={!availableTags.length || maxSelected}
            className="h-10 w-full justify-between border-slate-200 bg-white text-slate-800 shadow-sm"
          >
            {maxSelected ? 'Maximum 3 tags selected' : availableTags.length ? 'Browse tags' : 'No tags available'}
            <ChevronsUpDown className="h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] max-w-[calc(100vw-2rem)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search available tags..." />
            <CommandList>
              <CommandEmpty>No matching tags.</CommandEmpty>
              <CommandGroup heading="Available tags">
                {availableTags.map((tag) => {
                  const selected = selectedSet.has(normalizeCompare(tag));
                  return (
                    <CommandItem
                      key={tag}
                      value={tag}
                      disabled={selected || (!selected && maxSelected)}
                      onSelect={() => addTag(tag)}
                      className="justify-between"
                    >
                      <span>{tag}</span>
                      {selected ? <Check className="h-4 w-4 text-blue-700" /> : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-slate-500">{selectedTags.length}/3 selected. Tags must come from the existing source content taxonomy.</p>
    </div>
  );
}

export default function ContentUploadPage() {
  const [filters, setFilters] = useState<FilterResponse>(emptyFilters);
  const [pasteText, setPasteText] = useState('');
  const [draft, setDraft] = useState<UploadDraft>(emptyDraft);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/source-content/filters')
      .then(readJson)
      .then((body) => {
        if (!cancelled) setFilters({
          availableTags: uniqueOptions(body?.availableTags || []),
          availableTypes: uniqueOptions(body?.availableTypes || []),
          availableAuthors: uniqueOptions(body?.availableAuthors || []),
          availablePublishers: uniqueOptions(body?.availablePublishers || []),
        });
      })
      .catch((error) => toast.error(error?.message || 'Failed to load source taxonomy'))
      .finally(() => {
        if (!cancelled) setLoadingFilters(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const typeOptions = useMemo(() => {
    const defaults = ['Article', 'Newsletter', 'Market Commentary', 'Topic Discussion', 'Client Education'];
    return uniqueOptions([...filters.availableTypes, ...defaults]);
  }, [filters.availableTypes]);

  const canScan = pasteText.trim().length >= 40 && !scanning;
  const canSave = Boolean(
    draft.title.trim() &&
    draft.bodyText.trim().length >= 40 &&
    draft.contentDesignation &&
    draft.type &&
    draft.tags.length >= 1 &&
    draft.tags.length <= 3 &&
    !saving
  );
  const currentStep: 1 | 2 | 3 = savedId ? 3 : draft.bodyText.trim() ? 2 : 1;

  const scanContent = async () => {
    setScanning(true);
    setSavedId(null);
    try {
      const response = await fetch('/api/content-upload/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText, sourceUrl: draft.sourceUrl }),
      });
      const body = await readJson(response);
      if (body?.filters) {
        setFilters({
          availableTags: uniqueOptions(body.filters.availableTags || []),
          availableTypes: uniqueOptions(body.filters.availableTypes || []),
          availableAuthors: uniqueOptions(body.filters.availableAuthors || []),
          availablePublishers: uniqueOptions(body.filters.availablePublishers || []),
        });
      }
      setDraft({ ...emptyDraft, sourceUrl: draft.sourceUrl, ...body.draft });
      toast.success('Content scanned');
    } catch (error: any) {
      toast.error(error?.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const saveContent = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/content-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const body = await readJson(response);
      setSavedId(body?.content?.id || null);
      toast.success('Custom Content saved');
    } catch (error: any) {
      toast.error(error?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex w-full max-w-none flex-col gap-4">
      <PageHeader
        eyebrow="Beta Features"
        title="Content Upload"
        description="Paste custom content, scan it into source metadata, review controlled fields, and save it for use across Editorial tools."
        variant="azure"
        metrics={[
          { label: 'Paste content', detail: 'Step 1 input', icon: FileText, iconClassName: 'bg-blue-100 text-blue-700' },
          { label: 'Scan metadata', detail: 'AI-assisted draft schema', icon: Sparkles, iconClassName: 'bg-violet-100 text-violet-700' },
          { label: '1-3 tags', detail: 'Existing taxonomy only', icon: Tags, iconClassName: 'bg-emerald-100 text-emerald-700' },
          { label: 'Custom Content', detail: 'Saved as source content', icon: Database, iconClassName: 'bg-cyan-100 text-cyan-700' },
        ]}
      />
      <ContentUploadStepper currentStep={currentStep} />

      {currentStep === 1 ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]">
          <Card className="overflow-hidden border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold tracking-normal text-slate-950">Paste your content</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Paste plain or rich text. Formatting such as headings, lists, links, and emphasis will be preserved where possible.</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
                  <FileText className="h-4 w-4" />
                  Paste text
                </Button>
                <Button type="button" variant="outline" size="sm" disabled className="gap-2 border-slate-200 bg-slate-50 text-slate-500">
                  <UploadCloud className="h-4 w-4" />
                  Upload file
                </Button>
                <Badge variant="outline" className="rounded-md border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">Coming soon</Badge>
              </div>

              <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                  {[Undo2, Redo2].map((Icon, index) => (
                    <button key={index} type="button" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white" aria-label={index ? 'Redo' : 'Undo'}>
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                  <div className="mx-2 h-6 w-px bg-slate-200" />
                  <button type="button" className="flex h-8 min-w-28 items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-sm">
                    Paragraph
                    <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
                  </button>
                  <div className="mx-2 h-6 w-px bg-slate-200" />
                  {[Bold, Italic, List, ListOrdered, Link2, Type].map((Icon, index) => (
                    <button key={index} type="button" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white" aria-label="Editor control">
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
                <Textarea
                  value={pasteText}
                  onChange={(event) => setPasteText(event.target.value)}
                  placeholder="Paste the article or approved source material here..."
                  className="min-h-[330px] resize-y rounded-none border-0 bg-white p-4 text-sm leading-6 shadow-none focus-visible:ring-0"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm">
                  <span className="text-slate-600">{countWords(pasteText).toLocaleString()} words · {pasteText.trim().length.toLocaleString()} characters</span>
                  <span className={cn('inline-flex items-center gap-1.5 font-medium', pasteText.trim() ? 'text-emerald-700' : 'text-slate-500')}>
                    <CheckCircle2 className="h-4 w-4" />
                    {pasteText.trim() ? 'Rich text detected' : 'Ready for paste'}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="upload-source-url" className="text-sm font-semibold text-slate-950">
                  Original source URL <span className="font-normal text-slate-500">(Optional)</span>
                </Label>
                <Input
                  id="upload-source-url"
                  value={draft.sourceUrl}
                  onChange={(event) => setDraft((value) => ({ ...value, sourceUrl: event.target.value }))}
                  placeholder="https://example.com/original-article"
                  className="h-11 border-slate-200 bg-white shadow-sm"
                />
                <p className="text-xs text-slate-500">Used only as source metadata.</p>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variant="outline" className="h-10 min-w-24 border-slate-200 bg-white" onClick={() => setPasteText('')}>
                  Clear
                </Button>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="outline" className="h-10 min-w-40 border-blue-300 bg-white text-blue-700 hover:bg-blue-50" onClick={() => toast.info('Draft is kept on this page until you scan or save.')}>
                    Save as draft
                  </Button>
                  <Button type="button" onClick={scanContent} disabled={!canScan} className="h-10 min-w-40 gap-2 bg-violet-600 font-semibold hover:bg-violet-700">
                    {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {scanning ? 'Scanning...' : 'Scan content'}
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex justify-end text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5" />
                  Scanning suggests metadata; it does not save content.
                </span>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">What the scan will prepare</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">AI reads the pasted content and prepares an editable source record.</p>
                  </div>
                </div>
                <Badge variant="outline" className="rounded-md border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">Not scanned</Badge>
              </div>

              <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
                {[
                  { label: 'Title', icon: Type },
                  { label: 'Summary', icon: AlignLeft },
                  { label: 'Content designation', icon: Bookmark },
                  { label: 'Content type', icon: FileText },
                  { label: '1-3 approved tags', icon: Tags },
                  { label: 'Author and publication date', icon: CalendarDays },
                  { label: 'Content label / filename', icon: FileText },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-md border border-blue-200 bg-blue-50/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                    <LockKeyhole className="h-5 w-5" />
                  </span>
                  <div className="grid flex-1 gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <span className="font-semibold text-slate-950">Publisher</span>
                    <span className="text-slate-600">Custom Content</span>
                    <span className="font-semibold text-slate-950">Source system</span>
                    <span className="text-slate-600">Custom upload</span>
                    <span className="sm:col-span-2 text-xs text-slate-500">These values are assigned automatically.</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-slate-700">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <span>After saving, this content appears in Source Content and can be used in Generate Content, EchoWrite, Canadianizer, and other supported tools.</span>
                </div>
              </div>

              <button type="button" className="mt-5 flex h-11 w-full items-center gap-3 rounded-md border border-slate-200 bg-white px-4 text-left text-sm font-medium text-slate-700">
                <ChevronsUpDown className="h-4 w-4 rotate-90 text-slate-500" />
                View schema details
              </button>
            </div>
          </Card>
        </section>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Review source metadata</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Adjust the scanned fields before saving this as Custom Content.</p>
              </div>
            </div>
            <Badge className="rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Custom Content</Badge>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="upload-title">Title</Label>
              <Input
                id="upload-title"
                value={draft.title}
                onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))}
                placeholder="Source title"
                className="border-slate-200 bg-white shadow-sm"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="upload-summary">Summary</Label>
              <Textarea
                id="upload-summary"
                value={draft.summary}
                onChange={(event) => setDraft((value) => ({ ...value, summary: event.target.value }))}
                placeholder="Short source summary"
                className="min-h-24 resize-y border-slate-200 bg-white text-sm leading-6 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Content designation</Label>
              <Select value={draft.contentDesignation} onValueChange={(contentDesignation) => setDraft((value) => ({ ...value, contentDesignation, type: value.type || contentDesignation }))}>
                <SelectTrigger className="h-10 w-full border-slate-200 bg-white shadow-sm">
                  <SelectValue placeholder={loadingFilters ? 'Loading designations...' : 'Select designation'} />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={draft.type} onValueChange={(type) => setDraft((value) => ({ ...value, type }))}>
                <SelectTrigger className="h-10 w-full border-slate-200 bg-white shadow-sm">
                  <SelectValue placeholder={loadingFilters ? 'Loading types...' : 'Select type'} />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label>Tags</Label>
              <TagPicker
                availableTags={filters.availableTags}
                selectedTags={draft.tags}
                onChange={(tags) => setDraft((value) => ({ ...value, tags }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-author">Author</Label>
              <Input
                id="upload-author"
                value={draft.author}
                onChange={(event) => setDraft((value) => ({ ...value, author: event.target.value }))}
                placeholder="Optional"
                className="border-slate-200 bg-white shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-date">Published date</Label>
              <Input
                id="upload-date"
                type="date"
                value={draft.publishedAt}
                onChange={(event) => setDraft((value) => ({ ...value, publishedAt: event.target.value }))}
                className="border-slate-200 bg-white shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-filename">Filename</Label>
              <Input
                id="upload-filename"
                value={draft.filename}
                onChange={(event) => setDraft((value) => ({ ...value, filename: event.target.value }))}
                placeholder="custom-content.txt"
                className="border-slate-200 bg-white shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-audience">Recommended audience</Label>
              <Input
                id="upload-audience"
                value={draft.recommendedAudience}
                onChange={(event) => setDraft((value) => ({ ...value, recommendedAudience: event.target.value }))}
                placeholder="Optional"
                className="border-slate-200 bg-white shadow-sm"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="upload-body">Body text</Label>
              <Textarea
                id="upload-body"
                value={draft.bodyText}
                onChange={(event) => setDraft((value) => ({ ...value, bodyText: event.target.value }))}
                placeholder="Scanned source body"
                className="min-h-[240px] resize-y border-slate-200 bg-white text-sm leading-6 shadow-sm"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-sm text-slate-600">
              {savedId ? (
                <span className="font-medium text-emerald-700">Saved as Custom Content.</span>
              ) : (
                <span>Required: title, body, designation, type, and 1-3 existing tags.</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {savedId ? (
                <Button asChild variant="outline" className="gap-2 border-slate-200 bg-white">
                  <Link href={`/source-content?q=${encodeURIComponent(draft.title)}`} prefetch={false}>
                    <FileText className="h-4 w-4" />
                    View in Source Content
                  </Link>
                </Button>
              ) : null}
              <Button type="button" onClick={saveContent} disabled={!canSave} className={cn('h-11 gap-2 px-5 font-semibold', canSave ? 'bg-blue-700 hover:bg-blue-800' : '')}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save Custom Content'}
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
