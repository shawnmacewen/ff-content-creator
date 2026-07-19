import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import {
  ArrowRight,
  CalendarDays,
  DatabaseZap,
  FolderOpen,
  Image,
  Plus,
  Settings2,
  Sparkles,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardMetrics } from '@/lib/dashboard/metrics';

export const dynamic = 'force-dynamic';

type Icon = ComponentType<{ className?: string }>;
type SnapshotItem = {
  label: string;
  value: number;
  icon: Icon;
  tone: string;
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
  return (
    <Card className="gap-0 overflow-hidden rounded-lg border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="relative grid h-[158px] auto-rows-min grid-cols-[44px_minmax(0,1fr)] content-start gap-x-4 p-4">
        <span className={`row-span-4 flex h-11 w-11 items-center justify-center rounded-md ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 text-sm font-bold leading-5 text-slate-900">{label}</div>
          <div className="shrink-0">{children}</div>
        </div>
        <div className="mt-1 text-[30px] font-semibold leading-8 tracking-normal text-slate-950">{value}</div>
        <div className="mt-1 min-w-0 text-xs font-semibold leading-5 text-slate-500">{detail}</div>
        {action ? (
          <div className="absolute bottom-4 left-[72px]">
            {action}
          </div>
        ) : null}
        {!action ? (
          <div className="col-start-2" aria-hidden="true" />
        ) : null}
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
    <div className="pt-4">
      <TokenSparkline daily={daily} />
    </div>
  );
}

function TokenUsageLink() {
  return (
    <Link href="/token-usage" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600">
      View token log
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function HeaderActions() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" className="h-11 rounded-md border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
        <CalendarDays className="h-4 w-4" />
        Last 30 days
      </Button>
      <Button variant="outline" className="h-11 rounded-md border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
        <Settings2 className="h-4 w-4" />
        Customize dashboard
      </Button>
      <Button asChild className="h-11 rounded-md bg-blue-600 text-white hover:bg-blue-700">
        <Link href="/generate">
          <Plus className="h-4 w-4" />
          Quick create
        </Link>
      </Button>
    </div>
  );
}

function DashboardHero() {
  return (
    <section className="relative isolate overflow-hidden rounded-lg bg-[linear-gradient(112deg,#0b2a57_0%,#0a4d6d_58%,#075a71_100%)] px-7 py-6 text-white shadow-sm">
      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-55" viewBox="0 0 1600 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M -80 82 C 180 44, 360 58, 560 78 C 810 103, 955 44, 1160 24 C 1350 6, 1478 26, 1680 12" fill="none" stroke="rgba(255,255,255,0.17)" strokeWidth="1.4" />
        <path d="M 260 118 C 520 62, 760 95, 1012 84 C 1220 75, 1360 42, 1660 48" fill="none" stroke="rgba(125,211,252,0.18)" strokeWidth="1" />
        <path d="M 1010 120 C 1115 62, 1288 58, 1440 88 C 1520 104, 1594 105, 1668 92" fill="none" stroke="rgba(45,212,191,0.2)" strokeWidth="1.2" />
      </svg>
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Dashboard</h1>
          <p className="mt-2 text-sm font-medium text-white/90">Track source readiness, content production, and editorial workflow momentum.</p>
        </div>
        <HeaderActions />
      </div>
    </section>
  );
}

function MomentumChart({ daily }: { daily: Awaited<ReturnType<typeof getDashboardMetrics>>['daily'] }) {
  const maxValue = Math.max(10, ...daily.map((day) => day.total));
  const width = 760;
  const height = 230;
  const chartTop = 20;
  const chartHeight = 160;
  const barWidth = 12;
  const step = daily.length > 1 ? (width - 40) / (daily.length - 1) : width;
  const points = daily.map((day, index) => {
    const x = 20 + index * step;
    const y = chartTop + chartHeight - (day.total / maxValue) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full overflow-visible">
      {[0, 1, 2, 3, 4].map((tick) => {
        const y = chartTop + tick * (chartHeight / 4);
        return <line key={tick} x1="14" x2={width - 12} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
      })}
      {daily.map((day, index) => {
        const x = 20 + index * step;
        const imageHeight = Math.max(2, (day.images / maxValue) * chartHeight);
        const articleHeight = Math.max(2, (day.articles / maxValue) * chartHeight);
        const yImages = chartTop + chartHeight - imageHeight;
        const yArticles = yImages - articleHeight;
        return (
          <g key={day.date}>
            <rect x={x - barWidth / 2} y={yImages} width={barWidth} height={imageHeight} rx="3" fill="#67d5f5" opacity="0.9" />
            <rect x={x - barWidth / 2} y={yArticles} width={barWidth} height={articleHeight} rx="3" fill="#9257e8" opacity="0.78" />
          </g>
        );
      })}
      <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {daily.filter((_, index) => index % 7 === 0 || index === daily.length - 1).map((day, index) => {
        const originalIndex = daily.findIndex((entry) => entry.date === day.date);
        return (
          <text key={`${day.date}-${index}`} x={20 + originalIndex * step} y={height - 16} textAnchor="middle" className="fill-slate-500 text-[12px] font-medium">
            {day.label}
          </text>
        );
      })}
    </svg>
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
    <svg viewBox="0 0 120 42" className="h-10 w-28">
      <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
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
          detail={`${formatNumber(metrics.source.finraReviewedCount)} FINRA-reviewed sources`}
          icon={DatabaseZap}
          tone="bg-blue-100 text-blue-700"
        />
        <StatCard
          label="Token usage"
          value={formatCompact(metrics.tokenSummary.totalTokensThisWeek)}
          detail={`Estimated ${formatCost(metrics.tokenSummary.estimatedCostThisWeek)} this week`}
          icon={WalletCards}
          tone="bg-blue-100 text-blue-700"
          action={<TokenUsageLink />}
        >
          <TokenUsageSparkline daily={metrics.daily} />
        </StatCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.95fr)]">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-4 pb-0 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-slate-950">Editorial momentum</CardTitle>
              <div className="mt-5 grid grid-cols-3 gap-8 text-sm">
                <div><div className="text-2xl font-semibold text-slate-950">{formatNumber(totalGenerated)}</div><div className="text-slate-500">Total</div></div>
                <div><div className="text-2xl font-semibold text-slate-950">{formatNumber(metrics.totals.generatedAssets)}</div><div className="text-slate-500">Articles</div></div>
                <div><div className="text-2xl font-semibold text-slate-950">{formatNumber(metrics.totals.generatedImages)}</div><div className="text-slate-500">Images</div></div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {['7 days', '30 days', '90 days'].map((label) => (
                <Button key={label} variant="outline" size="sm" className={label === '30 days' ? 'border-blue-300 bg-blue-50 text-blue-700' : ''}>{label}</Button>
              ))}
              <Button variant="outline" size="sm">All generation tools</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="mb-3 flex justify-end gap-5 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> Articles</span>
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Images</span>
              <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 rounded-full bg-blue-600" /> Total</span>
            </div>
            <MomentumChart daily={metrics.daily} />
            <p className="mt-2 text-sm font-medium text-slate-500">Images represent {imagePercent}% of generated assets in this period.</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-950">Content snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshotItems.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-md ${tone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-semibold text-slate-800">{label}</span>
                </div>
                <span className="text-xl font-semibold text-slate-950">{formatNumber(value)}</span>
              </div>
            ))}
            <div>
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
            <div className="flex items-center justify-between pt-2">
              <Link href="/library" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600">Open saved content <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/source-content" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600">Browse sources <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl font-semibold text-slate-950">Recent token activity</CardTitle>
            <Badge variant="outline" className="rounded-md bg-slate-50">Last {metrics.recentEvents.length || 0} events</Badge>
          </div>
          <Link href="/token-usage" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600">Full token log <ArrowRight className="h-4 w-4" /></Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2">Time</th>
                  <th>Feature</th>
                  <th>Model</th>
                  <th>Input</th>
                  <th>Output</th>
                  <th>Total tokens</th>
                  <th>Est. cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.recentEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="py-2 font-medium text-slate-700">{formatRelativeTime(event.time)}</td>
                    <td className="font-semibold text-slate-900">{event.feature}</td>
                    <td><Badge variant="outline" className="rounded-md bg-blue-50 text-blue-700">{event.model}</Badge></td>
                    <td>{formatTokenValue(event.inputTokens)}</td>
                    <td>{formatTokenValue(event.outputTokens)}</td>
                    <td className="font-semibold">{formatTokenValue(event.totalTokens)}</td>
                    <td>{formatCost(event.estimatedCostUsd)}</td>
                    <td><Badge className="rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{event.success ? 'Complete' : 'Failed'}</Badge></td>
                  </tr>
                ))}
                {!metrics.recentEvents.length ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-slate-500">Recent token events are not available yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium text-slate-500">
            <span>{metrics.recentEvents.length} events</span>
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
