'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, FileText, Mail, Share2, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  totalGenerated: number;
  generatedThisWeek: number;
  socialCount: number;
  emailCount: number;
  articleCount: number;
}

export function StatsCards({
  totalGenerated,
  generatedThisWeek,
  socialCount,
  emailCount,
  articleCount,
}: StatsCardsProps) {
  const stats = [
    {
      title: 'Total Generated',
      value: totalGenerated,
      description: 'All time content pieces',
      icon: Sparkles,
      trend: null,
    },
    {
      title: 'This Week',
      value: generatedThisWeek,
      description: 'Content created this week',
      icon: TrendingUp,
      trend: '+12%',
    },
    {
      title: 'Social Posts',
      value: socialCount,
      description: 'Twitter, LinkedIn, Instagram',
      icon: Share2,
      trend: null,
    },
    {
      title: 'Emails & Articles',
      value: emailCount + articleCount,
      description: `${emailCount} emails, ${articleCount} articles`,
      icon: emailCount > articleCount ? Mail : FileText,
      trend: null,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.trend && (
                <span className="text-xs text-success">{stat.trend}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
