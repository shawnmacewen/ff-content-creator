'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { QuickActions } from '@/components/dashboard/quick-actions';
import useSWR from 'swr';
import { mapGeneratedContentRows } from '@/lib/mappers/generated-content';
import type { GeneratedContent } from '@/lib/types/content';
import { Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const { data } = useSWR<{ data: GeneratedContent[] }>(
    mounted ? '/api/generated-content' : null,
    fetcher
  );

  const content = mapGeneratedContentRows(data?.data || []);

  const recentContent = useMemo(
    () => [...content].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [content]
  );

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const generatedThisWeek = content.filter((c) => new Date(c.createdAt) >= weekAgo).length;
    const socialCount = content.filter((c) => (c.type || '').startsWith('social-')).length;
    const emailCount = content.filter((c) => (c.type || '').includes('email') || (c.type || '').includes('newsletter')).length;
    const articleCount = content.filter((c) => c.type === 'article' || c.type === 'infographic-copy').length;

    return {
      totalGenerated: content.length,
      generatedThisWeek,
      socialCount,
      emailCount,
      articleCount,
    };
  }, [content]);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to FF Content Creator
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to FF Content Creator. Generate AI-powered content for your editorial needs.
          </p>
        </div>
        <Link href="/generate">
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Content
          </Button>
        </Link>
      </div>

      <StatsCards
        totalGenerated={stats.totalGenerated}
        generatedThisWeek={stats.generatedThisWeek}
        socialCount={stats.socialCount}
        emailCount={stats.emailCount}
        articleCount={stats.articleCount}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity items={recentContent} />
        <QuickActions />
      </div>
    </div>
  );
}
