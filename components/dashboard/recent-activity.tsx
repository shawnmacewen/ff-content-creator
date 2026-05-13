'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CONTENT_TYPE_MAP, STATUS_COLORS } from '@/lib/content-config';
import type { GeneratedContent } from '@/lib/types/content';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Mail, Share2, BarChart } from 'lucide-react';

interface RecentActivityProps {
  items: GeneratedContent[];
}

function getIconForType(type: string) {
  if (type.startsWith('social-')) return Share2;
  if (type.includes('email') || type.includes('newsletter')) return Mail;
  if (type === 'infographic-copy') return BarChart;
  return FileText;
}

export function RecentActivity({ items }: RecentActivityProps) {
  if (items.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your generated content will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">No content generated yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start by creating your first piece of content
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest generated content</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {items.map((item) => {
              const Icon = getIconForType(item.type);
              const typeInfo = CONTENT_TYPE_MAP[item.type];
              
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-none">
                        {item.title || 'Untitled'}
                      </p>
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[item.status]}
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {typeInfo?.label || item.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
