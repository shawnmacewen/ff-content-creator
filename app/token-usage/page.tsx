import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Gauge,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type GenerationEventRow = {
  id: string;
  created_at: string;
  tool: string;
  content_type: string;
  success: boolean;
  model: string | null;
  meta: Record<string, any> | null;
};

type TokenUsageSummary = {
  rows: GenerationEventRow[];
  fallback: boolean;
  fallbackReason?: string;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatTool(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getAssetCount(row: GenerationEventRow) {
  return Math.max(1, Math.floor(Number(row.meta?.assetCount || row.meta?.asset_count || 1)));
}

function getTokenEstimate(row: GenerationEventRow) {
  const totalValue =
    row.meta?.totalTokens ||
    row.meta?.total_tokens ||
    row.meta?.tokenUsage?.totalTokens ||
    row.meta?.tokenUsage?.total_tokens ||
    row.meta?.tokens ||
    row.meta?.estimatedTokens ||
    row.meta?.estimated_tokens;
  const inputValue = row.meta?.inputTokens || row.meta?.input_tokens || row.meta?.tokenUsage?.inputTokens || row.meta?.tokenUsage?.input_tokens;
  const outputValue = row.meta?.outputTokens || row.meta?.output_tokens || row.meta?.tokenUsage?.outputTokens || row.meta?.tokenUsage?.output_tokens;
  const totalTokens = Number(totalValue);
  const inputTokens = Number(inputValue);
  const outputTokens = Number(outputValue);

  if (!Number.isFinite(totalTokens) || totalTokens <= 0) return 'Not tracked yet';

  const breakdown = Number.isFinite(inputTokens) && Number.isFinite(outputTokens)
    ? ` (${formatNumber(inputTokens)} in / ${formatNumber(outputTokens)} out)`
    : '';

  return `${formatNumber(totalTokens)} total${breakdown}`;
}

function getCostEstimate(row: GenerationEventRow) {
  const value = row.meta?.costUsd || row.meta?.cost_usd || row.meta?.estimatedCostUsd || row.meta?.estimated_cost_usd;
  const cost = Number(value);
  return Number.isFinite(cost) && cost > 0 ? `$${cost.toFixed(4)}` : 'Not tracked yet';
}

async function getTokenUsageSummary(): Promise<TokenUsageSummary> {
  try {
    const supabase = getSupabaseServerClient();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const query = supabase
      .from('generation_events')
      .select('id,created_at,tool,content_type,success,model,meta')
      .order('created_at', { ascending: false })
      .limit(200)
      .abortSignal(controller.signal);

    const { data, error } = await (async () => {
      try {
        return await query;
      } finally {
        clearTimeout(timeout);
      }
    })();

    if (error) {
      return { rows: [], fallback: true, fallbackReason: error.message };
    }

    return { rows: (data || []) as GenerationEventRow[], fallback: false };
  } catch (error: any) {
    return {
      rows: [],
      fallback: true,
      fallbackReason: error?.name === 'AbortError' ? 'token-usage-timeout' : error?.message || 'database-unavailable',
    };
  }
}

export default async function TokenUsagePage() {
  const summary = await getTokenUsageSummary();
  const successfulRows = summary.rows.filter((row) => row.success !== false);
  const imageEvents = successfulRows.filter((row) => row.meta?.category === 'image' || row.tool.includes('image'));
  const knownTokenRows = successfulRows.filter((row) => getTokenEstimate(row) !== 'Not tracked yet');
  const knownCostRows = successfulRows.filter((row) => getCostEstimate(row) !== 'Not tracked yet');
  const modelCount = new Set(successfulRows.map((row) => row.model).filter(Boolean)).size;
  const totalAssets = successfulRows.reduce((total, row) => total + getAssetCount(row), 0);

  const metricCards = [
    {
      label: 'Logged generations',
      value: formatNumber(successfulRows.length),
      detail: `${formatNumber(totalAssets)} generated asset${totalAssets === 1 ? '' : 's'} represented in recent events`,
      icon: Activity,
      className: 'bg-blue-100 text-blue-700',
    },
    {
      label: 'Models observed',
      value: formatNumber(modelCount),
      detail: 'Model names come from the existing generation event log',
      icon: Gauge,
      className: 'bg-violet-100 text-violet-700',
    },
    {
      label: 'Image events',
      value: formatNumber(imageEvents.length),
      detail: 'Image generation is tracked separately from text assets',
      icon: BarChart3,
      className: 'bg-cyan-100 text-cyan-700',
    },
    {
      label: 'Usage fields',
      value: knownTokenRows.length || knownCostRows.length ? 'Partial' : 'Pending',
      detail: 'Token and cost fields are ready here once routes write usage metadata',
      icon: BadgeDollarSign,
      className: 'bg-amber-100 text-amber-700',
    },
  ];

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <PageHeader
        eyebrow="Insights"
        title="Token Usage"
        description="Review recent generation activity, model usage, and the future token and cost estimate log."
        metrics={[]}
        variant="violet"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <Card key={metric.label} className="overflow-hidden rounded-lg border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
              <span className={`flex h-8 w-8 items-center justify-center rounded-md ${metric.className}`}>
                <metric.icon className="h-4 w-4" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{metric.value}</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Generation usage log</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recent rows from the existing <span className="font-mono text-xs">generation_events</span> table.
                </p>
              </div>
              <Badge variant="outline" className="w-fit">
                Last 200 events
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {summary.fallback ? (
              <div className="p-6 text-sm text-muted-foreground">
                Token usage data is unavailable right now: {summary.fallbackReason || 'database unavailable'}.
              </div>
            ) : summary.rows.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Time</TableHead>
                    <TableHead>Tool</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Assets</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead className="pr-4">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="pl-4 text-muted-foreground">{formatDateTime(row.created_at)}</TableCell>
                      <TableCell className="font-medium">{formatTool(row.tool)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{formatTool(row.content_type)}</span>
                          {row.success === false ? (
                            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                              Failed
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{row.model || 'Not recorded'}</TableCell>
                      <TableCell>{formatNumber(getAssetCount(row))}</TableCell>
                      <TableCell className="text-muted-foreground">{getTokenEstimate(row)}</TableCell>
                      <TableCell className="pr-4 text-muted-foreground">{getCostEstimate(row)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">
                No generation events have been logged yet.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-lg border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DatabaseZap className="h-4 w-4 text-primary" />
                Data source
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                Editorial already stores generation activity in <span className="font-mono text-xs">generation_events</span>.
                This page reads that log for tool, content type, success, model, category, and asset count.
              </p>
              <p>
                Token and cost estimates are not consistently written yet, so those cells remain blank until the generation
                routes record usage metadata.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Next wiring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <div className="flex items-start gap-2">
                <Clock3 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Add token fields to generation route metadata when the model provider returns usage.</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock3 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Add per-model pricing rules so estimated costs can be calculated consistently.</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock3 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Add filters for tool, model, date range, and successful or failed generations.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
