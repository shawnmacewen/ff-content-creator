'use client';

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
import { CONTENT_TYPE_MAP, STATUS_COLORS } from '@/lib/content-config';
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
} from 'lucide-react';

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
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${savedMeta.iconClassName}`}>
                    <ToolIcon className="h-4 w-4" />
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
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Badge variant="secondary" className={STATUS_COLORS[item.status]}>
                  {item.status}
                </Badge>
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
