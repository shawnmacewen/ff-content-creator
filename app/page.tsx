import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import {
  ArrowRight,
  DatabaseZap,
  FolderOpen,
  Image,
  Sparkles,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MomentumChart } from '@/components/dashboard/momentum-chart';
import { getDashboardMetrics } from '@/lib/dashboard/metrics';

export const dynamic = 'force-dynamic';

type Icon = ComponentType<{ className?: string }>;
type SnapshotItem = {
  label: string;
  value: number;
  icon: Icon;
  tone: string;
};
type DashboardSearchParams = Record<string, string | string[] | undefined>;
type DashboardPageProps = {
  searchParams?: DashboardSearchParams | Promise<DashboardSearchParams>;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(value || 0));
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000000 ? 2 : 1,
  }).format(value || 0);
}

function formatCost(value: number | null | undefined) {
  if (!value) return '$0.00';
  return `$${value.toFixed(value >= 10 ? 2 : 4)}`;
}

function formatTokenValue(value: number | null | undefined) {
  if (!value) return '-';
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)}K` : formatNumber(value);
}

function formatRelativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'Time unavailable';
  const diffMinutes = Math.max(1, Math.round((Date.now() - time) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  action,
  children,
}: {
  label: string;
  value: string;
  detail: string;
  icon: Icon;
  tone: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  const aside = action || children;

  return (
    <Card className="gap-0 overflow-hidden rounded-lg border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="grid h-[140px] grid-cols-[52px_minmax(0,1fr)_minmax(76px,112px)] grid-rows-[auto_1fr_auto] gap-x-4 p-4">
        <div className="col-span-3 min-w-0 text-sm font-bold leading-5 text-slate-900">{label}</div>
        <span className={`col-start-1 row-start-2 flex h-12 w-12 self-center items-center justify-center rounded-md ${tone}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="col-start-2 row-start-2 self-center text-[30px] font-semibold leading-9 tracking-normal text-slate-950">{value}</div>
        {aside ? (
          <div className="col-start-3 row-start-2 self-center justify-self-end">
            {aside}
          </div>
        ) : null}
        <div className="col-span-3 row-start-3 truncate text-xs font-semibold leading-5 text-slate-500">{detail}</div>
      </CardContent>
    </Card>
  );
}

function WeekChange({ value }: { value: number | null }) {
  return (
    <div className={`w-[72px] text-right text-xs font-bold leading-4 ${value === null || value >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
      {value === null ? '-' : `${value > 0 ? '+' : ''}${value}%`}
      <div className="font-medium text-slate-500">vs last week</div>
    </div>
  );
}

function TokenUsageSparkline({ daily }: { daily: Awaited<ReturnType<typeof getDashboardMetrics>>['daily'] }) {
  return (
    <div>
      <TokenSparkline daily={daily} />
    </div>
  );
}

function DashboardHeroDecoration() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      viewBox="0 0 1600 150"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dashboard-header-ribbon" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#49aaa6" stopOpacity="0" />
          <stop offset="38%" stopColor="#49aaa6" stopOpacity="0.23" />
          <stop offset="72%" stopColor="#9dd9d2" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#9dd9d2" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="dashboard-header-line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#49aaa6" stopOpacity="0" />
          <stop offset="44%" stopColor="#49aaa6" stopOpacity="0.46" />
          <stop offset="90%" stopColor="#9dd9d2" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#9dd9d2" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M -120 126 C 160 62, 425 72, 690 99 C 935 124, 1115 128, 1365 78 C 1500 51, 1595 50, 1700 66 L 1700 116 C 1495 101, 1348 113, 1138 141 C 885 175, 658 137, 430 113 C 205 90, 18 101, -120 146 Z"
        fill="url(#dashboard-header-ribbon)"
        opacity="0.8"
      />
      <path
        d="M -80 116 C 230 60, 510 70, 780 98 C 1035 125, 1240 103, 1685 58"
        fill="none"
        stroke="url(#dashboard-header-line)"
        strokeWidth="1.1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 1050 154 A 142 120 0 0 1 1334 154"
        fill="none"
        stroke="url(#dashboard-header-line)"
        strokeWidth="1.25"
        opacity="0.58"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function DashboardHero() {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div
        className="relative isolate overflow-hidden p-6 text-white sm:p-7"
        style={{ background: 'linear-gradient(108deg, #10233e 0%, #143a7b 50%, #0f6f8f 100%)' }}
      >
        <DashboardHeroDecoration />
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-3xl font-semibold leading-tight tracking-normal text-white">Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-white/84">Track source readiness, content production, and editorial workflow momentum.</p>
        </div>
      </div>
    </section>
  );
}

function TokenSparkline({ daily }: { daily: Awaited<ReturnType<typeof getDashboardMetrics>>['daily'] }) {
  const data = daily.slice(-14);
  const maxValue = Math.max(1, ...data.map((day) => day.total));
  const points = data.map((day, index) => {
    const x = index * (120 / Math.max(1, data.length - 1));
    const y = 36 - (day.total / maxValue) * 32;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 120 42" className="h-10 w-24">
      <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getRange(searchParams: DashboardSearchParams) {
  const rawValue = searchParams.range;
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const parsed = Number(value);
  return [7, 30, 90].includes(parsed) ? parsed : 30;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = searchParams ? await searchParams : {};
  const activeRange = getRange(params);
  const metrics = await getDashboardMetrics(activeRange);
  const totalGenerated = metrics.totals.generatedAssets + metrics.totals.generatedImages;
  const generatedThisWeek = metrics.totals.generatedAssetsThisWeek + metrics.totals.generatedImagesThisWeek;
  const generatedPreviousWeek = metrics.totals.generatedAssetsPreviousWeek + metrics.totals.generatedImagesPreviousWeek;
  const weeklyChangePercent = generatedPreviousWeek
    ? Math.round(((generatedThisWeek - generatedPreviousWeek) / generatedPreviousWeek) * 100)
    : null;
  const articlePercent = totalGenerated ? Math.round((metrics.totals.generatedAssets / totalGenerated) * 100) : 0;
  const imagePercent = totalGenerated ? 100 - articlePercent : 0;
  const snapshotItems: SnapshotItem[] = [
    { label: 'Articles generated', value: metrics.totals.generatedAssets, icon: Sparkles, tone: 'bg-violet-100 text-violet-700' },
    { label: 'Images generated', value: metrics.totals.generatedImages, icon: Image, tone: 'bg-sky-100 text-sky-700' },
    { label: 'Saved outputs', value: metrics.totals.savedOutputs, icon: FolderOpen, tone: 'bg-emerald-100 text-emerald-700' },
    { label: 'Source articles', value: metrics.source.totalSourceContent, icon: DatabaseZap, tone: 'bg-blue-100 text-blue-700' },
  ];

  return (
    <div className="flex w-full max-w-none flex-col gap-4">
      <DashboardHero />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Generated assets"
          value={formatNumber(totalGenerated)}
          detail={`${formatNumber(metrics.totals.generatedAssets)} articles - ${formatNumber(metrics.totals.generatedImages)} images`}
          icon={Sparkles}
          tone="bg-violet-100 text-violet-700"
        >
          <Badge className="rounded-md bg-violet-100 text-violet-700 hover:bg-violet-100">All time</Badge>
        </StatCard>
        <StatCard
          label="Generated this week"
          value={formatNumber(generatedThisWeek)}
          detail={`${formatNumber(metrics.totals.generatedAssetsThisWeek)} articles - ${formatNumber(metrics.totals.generatedImagesThisWeek)} images`}
          icon={TrendingUp}
          tone="bg-blue-100 text-blue-700"
        >
          <WeekChange value={weeklyChangePercent} />
        </StatCard>
        <StatCard
          label="Source library"
          value={formatNumber(metrics.source.totalSourceContent)}
          detail={`${formatNumber(metrics.source.finraReviewedCount)} FINRA-reviewed`}
          icon={DatabaseZap}
          tone="bg-blue-100 text-blue-700"
        />
        <StatCard
          label="Token usage"
          value={formatCompact(metrics.tokenSummary.totalTokensThisWeek)}
          detail={`${formatCost(metrics.tokenSummary.estimatedCostThisWeek)} this week`}
          icon={WalletCards}
          tone="bg-blue-100 text-blue-700"
          action={<TokenUsageSparkline daily={metrics.daily} />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.95fr)]">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-4 pb-0 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-slate-950">Editorial momentum</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              {[7, 30, 90].map((range) => (
                <Button key={range} asChild variant="outline" size="sm" className={activeRange === range ? 'border-blue-300 bg-blue-50 text-blue-700' : ''}>
                  <Link href={`/?range=${range}`}>{range} days</Link>
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <MomentumChart daily={metrics.daily} rangeDays={activeRange} />
            <p className="mt-2 text-sm font-medium text-slate-500">Images represent {imagePercent}% of generated assets in this period.</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-950">Content snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-slate-200">
            {snapshotItems.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="flex items-center justify-between border-b border-slate-200 px-3 py-3 last:border-b-0">
                <div className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-md ${tone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-semibold text-slate-800">{label}</span>
                </div>
                <span className="text-xl font-semibold text-slate-950">{formatNumber(value)}</span>
              </div>
            ))}
            </div>
            <div className="mt-4">
              <div className="mb-2 text-sm font-semibold text-slate-700">Generated mix</div>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="bg-violet-500" style={{ width: `${articlePercent}%` }} />
                <div className="bg-sky-400" style={{ width: `${imagePercent}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-xs font-semibold text-slate-500">
                <span>{articlePercent}% Articles</span>
                <span>{imagePercent}% Images</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl font-semibold text-slate-950">Recent token activity</CardTitle>
            <Badge variant="outline" className="rounded-md bg-slate-50">Last {metrics.recentEvents.length || 0} groups</Badge>
          </div>
          <Link href="/token-usage" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600">Full token log <ArrowRight className="h-4 w-4" /></Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2">Time</th>
                  <th>Event ID</th>
                  <th>Feature</th>
                  <th>Models</th>
                  <th>Assets</th>
                  <th>Total tokens</th>
                  <th>Estimated cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.recentEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="py-2 font-medium text-slate-700">{formatRelativeTime(event.time)}</td>
                    <td>
                      <span className="block max-w-[230px] whitespace-normal break-all font-mono text-[11px] leading-4 text-slate-600" title={event.groupId}>
                        {event.groupId}
                      </span>
                    </td>
                    <td className="font-semibold text-slate-900">{event.feature}</td>
                    <td className="max-w-[250px] whitespace-normal text-slate-700">{event.models.join(', ')}</td>
                    <td className="font-semibold">{formatNumber(event.assets)}</td>
                    <td className="font-semibold">{formatTokenValue(event.totalTokens)}</td>
                    <td>{formatCost(event.estimatedCostUsd)}</td>
                  </tr>
                ))}
                {!metrics.recentEvents.length ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-slate-500">Recent token events are not available yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium text-slate-500">
            <span>{metrics.recentEvents.length} event groups</span>
            <span>-</span>
            <span>{formatTokenValue(metrics.tokenSummary.totalTokensThisWeek)} tokens this week</span>
            <span>-</span>
            <span>{formatCost(metrics.tokenSummary.estimatedCostThisWeek)} estimated</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
