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

        return (
          <Card
            key={item.id}
            className="bg-card border-border hover:border-primary/50 transition-colors"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
                      {item.title}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {typeInfo?.label || item.type}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-3">{item.content}</p>
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
