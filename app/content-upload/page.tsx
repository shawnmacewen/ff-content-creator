'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronsUpDown,
  FileText,
  Loader2,
  Save,
  Search,
  Sparkles,
  Tags,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

  const scanContent = async () => {
    setScanning(true);
    setSavedId(null);
    try {
      const response = await fetch('/api/content-upload/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText }),
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
      setDraft({ ...emptyDraft, ...body.draft });
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
    <div className="flex w-full max-w-none flex-col gap-6">
      <PageHeader
        eyebrow="Beta Features"
        title="Content Upload"
        description="Paste custom content, scan it into source metadata, review the controlled fields, and save it for use across Editorial tools."
        variant="emerald"
        metrics={[
          { label: 'Paste text', detail: 'V1 input', icon: UploadCloud },
          { label: '1-3 tags', detail: 'Taxonomy limited', icon: Tags },
          { label: 'Custom Content', detail: 'Saved as source content', icon: FileText },
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <UploadCloud className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Paste content</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Paste the source text you want to add. File upload comes after this first pass.</p>
            </div>
          </div>

          <Textarea
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            placeholder="Paste the article or approved source material here..."
            className="mt-5 min-h-[360px] resize-y border-slate-200 bg-white text-sm leading-6 shadow-sm"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">{pasteText.trim().length.toLocaleString()} characters</span>
            <Button type="button" onClick={scanContent} disabled={!canScan} className="h-11 gap-2 bg-emerald-600 px-5 font-semibold hover:bg-emerald-700">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {scanning ? 'Scanning...' : 'Scan content'}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
        </div>
      </section>
    </div>
  );
}
