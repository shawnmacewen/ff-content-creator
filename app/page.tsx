import type { ComponentType } from 'react';
import {
  DatabaseZap,
  Mail,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import OperatingJourney from '@/components/dashboard/operating-journey';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardMetrics } from '@/lib/dashboard/metrics';

export const dynamic = 'force-dynamic';

type Icon = ComponentType<{ className?: string }>;

type Accent = {
  icon: string;
  bar: string;
};

const accents: Accent[] = [
  {
    icon: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
    bar: 'bg-blue-500',
  },
  {
    icon: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
    bar: 'bg-violet-500',
  },
  {
    icon: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200',
    bar: 'bg-cyan-500',
  },
  {
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
    bar: 'bg-emerald-500',
  },
  {
    icon: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200',
    bar: 'bg-sky-500',
  },
];

function formatMetric(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function buildDashboardMetrics(metrics: Awaited<ReturnType<typeof getDashboardMetrics>>): { label: string; value: string; detail: string; icon: Icon }[] {
  if (metrics.fallback) {
    return [
      {
        label: 'Generated assets',
        value: '0',
        detail: `Metrics unavailable: ${metrics.fallbackReason || 'database-unavailable'}`,
        icon: Sparkles,
      },
      {
        label: 'This week',
        value: '0',
        detail: 'Recent generation counts will return when metrics are available',
        icon: TrendingUp,
      },
      {
        label: 'Source library',
        value: '0',
        detail: 'Cached source summary is not available yet',
        icon: DatabaseZap,
      },
      {
        label: 'Saved outputs',
        value: '0',
        detail: 'Saved content count is not available yet',
        icon: Mail,
      },
    ];
  }

  return [
    {
      label: 'Generated assets',
      value: formatMetric(metrics.totals.generatedAssets),
      detail: `${formatMetric(metrics.totals.generatedImages)} generated image${metrics.totals.generatedImages === 1 ? '' : 's'} tracked separately`,
      icon: Sparkles,
    },
    {
      label: 'This week',
      value: formatMetric(metrics.totals.generatedAssetsThisWeek),
      detail: `${formatMetric(metrics.totals.generatedImagesThisWeek)} image generation${metrics.totals.generatedImagesThisWeek === 1 ? '' : 's'} this week`,
      icon: TrendingUp,
    },
    {
      label: 'Source library',
      value: formatMetric(metrics.source.totalSourceContent),
      detail: `${formatMetric(metrics.source.finraReviewedCount)} FINRA reviewed from cached source stats`,
      icon: DatabaseZap,
    },
    {
      label: 'Saved outputs',
      value: formatMetric(metrics.totals.savedOutputs),
      detail: 'Durable drafts in Saved Content',
      icon: Mail,
    },
  ];
}

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
  const dashboardMetrics = buildDashboardMetrics(metrics);

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Dashboard"
        description="Track source readiness, content production, and editorial workflow momentum."
        metrics={[]}
        variant="teal"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((metric, index) => (
          <Card key={metric.label} className="overflow-hidden rounded-lg border-border bg-card shadow-sm">
            <div className={`h-1 ${accents[index % accents.length].bar}`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
              <span className={`flex h-8 w-8 items-center justify-center rounded-md ${accents[index % accents.length].icon}`}>
                <metric.icon className="h-4 w-4" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{metric.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <OperatingJourney />
    </div>
  );
}
