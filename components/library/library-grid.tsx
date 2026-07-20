'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CONTENT_TYPE_MAP } from '@/lib/content-config';
import type { GeneratedContent } from '@/lib/types/content';
import { formatDistanceToNow } from 'date-fns';
import {
  MoreHorizontal,
  Copy,
  Trash2,
  Edit,
  Eye,
  FileText,
  Mail,
  Share2,
  BarChart,
  Layers3,
  PenLine,
  Sparkles,
  Globe2,
  Package,
  NotebookPen,
  Clock3,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LibraryGridProps {
  items: GeneratedContent[];
  onView: (item: GeneratedContent) => void;
  onEdit: (item: GeneratedContent) => void;
  onDelete: (id: string) => void;
  onCopy: (content: string) => void;
}

function getIconForType(type: string) {
  if (type.startsWith('social-')) return Share2;
  if (type.includes('email') || type.includes('newsletter')) return Mail;
  if (type === 'infographic-copy') return BarChart;
  return FileText;
}

function contentNotes(item: GeneratedContent) {
  return item.versions.map((version) => version.note || '').filter(Boolean).join(' ');
}

function inferSavedContentMeta(item: GeneratedContent) {
  const notes = contentNotes(item);
  const combined = `${item.title} ${item.type} ${item.prompt} ${notes}`.toLowerCase();
  const typeInfo = CONTENT_TYPE_MAP[item.type];
  const isEmailSequence = item.type === 'email-sequence';
  const isCampaign = /\b(campaign|kit)\b/i.test(combined);

  if (combined.includes('echowrite')) {
    return {
      tool: 'EchoWrite',
      toolDetail: 'Generated in EchoWrite',
      assetScope: 'Single asset',
      assetDetail: typeInfo?.label || item.type,
      Icon: PenLine,
      badgeClassName: 'border-cyan-200 bg-cyan-50 text-cyan-700',
      iconClassName: 'bg-cyan-50 text-cyan-700',
    };
  }

  if (combined.includes('canadianizer')) {
    const variant = combined.includes('french') ? 'French version' : combined.includes('english') ? 'English version' : 'English/French capable';
    return {
      tool: 'Canadianizer',
      toolDetail: 'Canadian adaptation workflow',
      assetScope: 'Multi-version',
      assetDetail: variant,
      Icon: Globe2,
      badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      iconClassName: 'bg-emerald-50 text-emerald-700',
    };
  }

  if (isCampaign) {
    return {
      tool: 'Generate Content',
      toolDetail: 'Campaign/KIT generator',
      assetScope: 'Multi-asset',
      assetDetail: 'Combined campaign tile',
      Icon: Package,
      badgeClassName: 'border-violet-200 bg-violet-50 text-violet-700',
      iconClassName: 'bg-violet-50 text-violet-700',
    };
  }

  if (isEmailSequence) {
    return {
      tool: 'Generate Content',
      toolDetail: 'Generated in Generate Content',
      assetScope: 'Multi-touch',
      assetDetail: typeInfo?.label || item.type,
      Icon: Layers3,
      badgeClassName: 'border-blue-200 bg-blue-50 text-blue-700',
      iconClassName: 'bg-blue-50 text-blue-700',
    };
  }

  return {
    tool: 'Generate Content',
    toolDetail: 'Generated in Generate Content',
    assetScope: 'Single asset',
    assetDetail: typeInfo?.label || item.type,
    Icon: Sparkles,
    badgeClassName: 'border-blue-200 bg-blue-50 text-blue-700',
    iconClassName: 'bg-blue-50 text-blue-700',
  };
}

export function LibraryGrid({ items, onView, onEdit, onDelete, onCopy }: LibraryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium">No content yet</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Generate your first piece of content to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = getIconForType(item.type);
        const typeInfo = CONTENT_TYPE_MAP[item.type];
        const savedMeta = inferSavedContentMeta(item);
        const ToolIcon = savedMeta.Icon;

        return (
          <Card
            key={item.id}
            className="bg-card border-border hover:border-primary/50 transition-colors"
          >
            <CardHeader className="pb-3">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={savedMeta.badgeClassName}>
                  <ToolIcon className="h-3.5 w-3.5" />
                  {savedMeta.tool}
                </Badge>
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                  <Layers3 className="h-3.5 w-3.5" />
                  {savedMeta.assetScope}
                </Badge>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${savedMeta.iconClassName}`}>
                    <ToolIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
                      {item.title}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs leading-5">
                      {savedMeta.toolDetail} - {savedMeta.assetDetail}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="h-8 shrink-0 gap-1.5 rounded-md px-3 text-xs font-semibold shadow-sm">
                      <MoreHorizontal className="h-4 w-4" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(item)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCopy(item.content)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(item.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-3">{item.content}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {typeInfo?.label || item.type}
                </Badge>
                {item.sourceContentIds.length ? (
                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                    {item.sourceContentIds.length} source{item.sourceContentIds.length === 1 ? '' : 's'}
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-center justify-end pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function LibraryList({ items, onView, onEdit, onDelete, onCopy }: LibraryGridProps) {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id || null);

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) || items[0] || null,
    [items, selectedId]
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium">No content yet</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Generate your first piece of content to see it here
        </p>
      </div>
    );
  }

  const selectedMeta = selectedItem ? inferSavedContentMeta(selectedItem) : null;
  const SelectedToolIcon = selectedMeta?.Icon || FileText;
  const selectedTypeInfo = selectedItem ? CONTENT_TYPE_MAP[selectedItem.type] : null;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.9fr)]">
      <Card className="gap-0 overflow-hidden border-border bg-card py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="grid grid-cols-[44px_minmax(260px,1.6fr)_minmax(150px,0.75fr)_minmax(140px,0.75fr)_minmax(150px,0.8fr)_94px] border-b border-border bg-slate-50/80 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 max-xl:hidden">
            <span className="flex items-center">
              <span className="h-4 w-4 rounded border border-slate-300 bg-white" />
            </span>
            <span>Package</span>
            <span>Created by</span>
            <span>Package type</span>
            <span>Contents</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y divide-border">
            {items.map((item) => {
              const typeInfo = CONTENT_TYPE_MAP[item.type];
              const TypeIcon = getIconForType(item.type);
              const meta = inferSavedContentMeta(item);
              const ToolIcon = meta.Icon;
              const selected = selectedItem?.id === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  onDoubleClick={() => onView(item)}
                  className={cn(
                    'grid w-full grid-cols-1 gap-2 border-y-2 border-l-2 border-r-2 border-transparent px-4 py-2 text-left transition hover:bg-slate-50 xl:grid-cols-[44px_minmax(260px,1.6fr)_minmax(150px,0.75fr)_minmax(140px,0.75fr)_minmax(150px,0.8fr)_94px] xl:items-center',
                    selected && 'border-blue-600 bg-blue-50/70 hover:bg-blue-50'
                  )}
                >
                  <span className="hidden xl:flex">
                    <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border', selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white')}>
                      {selected ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                    </span>
                  </span>
                  <span className="flex min-w-0 items-start gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${meta.iconClassName}`}>
                      <ToolIcon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-950">{item.title}</span>
                    </span>
                  </span>
                  <span>
                    <Badge variant="outline" className={meta.badgeClassName}>
                      <ToolIcon className="h-3.5 w-3.5" />
                      {meta.tool}
                    </Badge>
                  </span>
                  <span>
                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                      <Layers3 className="h-3.5 w-3.5" />
                      {meta.assetScope}
                    </Badge>
                  </span>
                  <span className="flex flex-col gap-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                      <TypeIcon className="h-3.5 w-3.5" />
                      {typeInfo?.label || item.type}
                    </span>
                    <span>{item.sourceContentIds.length || 0} source{item.sourceContentIds.length === 1 ? '' : 's'}</span>
                  </span>
                  <span className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-md border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      onClick={(event) => { event.stopPropagation(); onView(item); }}
                    >
                      <NotebookPen className="h-4 w-4" />
                    </Button>
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 border-border bg-card py-0 shadow-sm">
        {selectedItem && selectedMeta ? (
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-bold">Package preview</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(selectedItem)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCopy(selectedItem.content)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(selectedItem.id)} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${selectedMeta.iconClassName}`}>
                <SelectedToolIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={selectedMeta.badgeClassName}>
                    {selectedMeta.tool}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                    {selectedMeta.assetScope}
                  </Badge>
                </div>
                <h3 className="mt-3 text-lg font-bold leading-tight text-slate-950">{selectedItem.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{selectedItem.content}</p>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Included content</div>
              <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                  {selectedTypeInfo ? <FileText className="h-4 w-4" /> : <SelectedToolIcon className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-950">{selectedTypeInfo?.label || selectedItem.type}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{selectedMeta.assetDetail}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</div>
                <div className="mt-1 inline-flex items-center gap-1.5 text-slate-700">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatDistanceToNow(new Date(selectedItem.createdAt), { addSuffix: true })}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sources</div>
                <div className="mt-1 text-slate-700">{selectedItem.sourceContentIds.length || 0} linked</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Versions</div>
                <div className="mt-1 text-slate-700">{selectedItem.versions.length || 1}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-border pt-4">
              <Button type="button" className="gap-2 rounded-md" onClick={() => onView(selectedItem)}>
                <Eye className="h-4 w-4" />
                Open package
              </Button>
              <Button type="button" variant="outline" className="gap-2 rounded-md border-slate-200 bg-white" onClick={() => onCopy(selectedItem.content)}>
                <Copy className="h-4 w-4" />
                Reuse
              </Button>
            </div>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}

export function LibraryColumns({ items, onView, onEdit, onDelete, onCopy }: LibraryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium">No content yet</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Generate your first piece of content to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((item) => {
        const typeInfo = CONTENT_TYPE_MAP[item.type];
        const TypeIcon = getIconForType(item.type);
        const savedMeta = inferSavedContentMeta(item);
        const ToolIcon = savedMeta.Icon;

        return (
          <Card
            key={item.id}
            className="overflow-hidden border-border bg-card shadow-sm transition-colors hover:border-primary/50"
          >
            <CardContent className="p-0">
              <div className="flex items-start gap-4 p-4">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${savedMeta.iconClassName}`}>
                  <ToolIcon className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={savedMeta.badgeClassName}>
                      <ToolIcon className="h-3.5 w-3.5" />
                      {savedMeta.tool}
                    </Badge>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                      <Layers3 className="h-3.5 w-3.5" />
                      {savedMeta.assetScope}
                    </Badge>
                  </div>

                  <h3 className="mt-3 line-clamp-2 text-base font-bold leading-tight text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                    {item.content}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(item)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCopy(item.content)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(item.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid gap-2 border-y border-border bg-slate-50/70 px-4 py-3 text-xs text-slate-600 sm:grid-cols-3">
                <div>
                  <div className="font-bold uppercase tracking-wide text-slate-500">Package type</div>
                  <div className="mt-1 inline-flex min-w-0 items-center gap-1.5 font-semibold text-slate-800">
                    <TypeIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{typeInfo?.label || item.type}</span>
                  </div>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-wide text-slate-500">Contents</div>
                  <div className="mt-1 font-semibold text-slate-800">{savedMeta.assetDetail}</div>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-wide text-slate-500">Updated</div>
                  <div className="mt-1 inline-flex items-center gap-1.5 font-semibold text-slate-800">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="text-xs text-slate-500">
                  {item.sourceContentIds.length || 0} linked source{item.sourceContentIds.length === 1 ? '' : 's'} / {item.versions.length || 1} version{item.versions.length === 1 ? '' : 's'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 rounded-md border-slate-200 bg-white"
                    onClick={() => onCopy(item.content)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Reuse
                  </Button>
                  <Button type="button" size="sm" className="h-8 gap-2 rounded-md" onClick={() => onView(item)}>
                    <Eye className="h-3.5 w-3.5" />
                    Open
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
