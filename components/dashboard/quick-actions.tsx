'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CONTENT_TYPES } from '@/lib/content-config';
import {
  Twitter,
  Linkedin,
  Instagram,
  Mail,
  Newspaper,
  FileText,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  mail: Mail,
  newspaper: Newspaper,
  'file-text': FileText,
  'bar-chart': BarChart3,
};

export function QuickActions() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Quick Create</CardTitle>
        <CardDescription>Jump straight into content creation</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {CONTENT_TYPES.map((contentType) => {
            const Icon = iconMap[contentType.icon] || FileText;
            
            return (
              <Link
                key={contentType.id}
                href={`/generate?type=${contentType.id}`}
              >
                <Button
                  variant="outline"
                  className="w-full justify-between h-auto py-3 px-4 hover:bg-muted/50 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{contentType.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {contentType.category}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
