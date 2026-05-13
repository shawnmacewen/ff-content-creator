'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { getContentStats, getRecentContent } from '@/lib/storage/local-storage';
import type { GeneratedContent } from '@/lib/types/content';
import { Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalGenerated: 0,
    generatedThisWeek: 0,
    socialCount: 0,
    emailCount: 0,
    articleCount: 0,
  });
  const [recentContent, setRecentContent] = useState<GeneratedContent[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const contentStats = getContentStats();
    setStats(contentStats);
    setRecentContent(getRecentContent(5));
  }, []);

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
