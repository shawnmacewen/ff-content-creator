import {
  Activity,
  BadgeDollarSign,
  BarChart3,
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
import { estimateGenerationCostUsd, getModelPricingRule } from '@/lib/model-pricing';
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

type TokenUsageSearchParams = Record<string, string | string[] | undefined>;

type TokenUsagePageProps = {
  searchParams?: TokenUsageSearchParams | Promise<TokenUsageSearchParams>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeFilterValue(value: string | string[] | undefined) {
  return String(firstParam(value) || '').trim();
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
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
  const aliases: Record<string, string> = {
    'image-generation': 'Generate Content',
    'image-test': 'Generate Content',
    'carousel-image': 'Generate Content',
    'carousel-plan': 'Generate Content',
    'instagram-carousel-image-test': 'Instagram Carousel Image',
  };
  if (aliases[value]) return aliases[value];

  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getAssetCount(row: GenerationEventRow) {
  return Math.max(1, Math.floor(Number(row.meta?.assetCount || row.meta?.asset_count || 1)));
}

function getEventGroupId(row: GenerationEventRow) {
  const value =
    row.meta?.generationGroupId ||
    row.meta?.generation_group_id ||
    row.meta?.kitGenerationId ||
    row.meta?.kit_generation_id ||
    row.meta?.parentEventId ||
    row.meta?.parent_event_id;

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function formatEventGroup(row: GenerationEventRow) {
  const groupId = getEventGroupId(row);
  if (!groupId) return 'Standalone';
  return groupId;
}

function pushModelName(models: string[], value: unknown) {
  if (!value) return;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed && !models.some((model) => model.toLowerCase() === trimmed.toLowerCase())) models.push(trimmed);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => pushModelName(models, entry));
    return;
  }

  if (typeof value === 'object') {
    const modelValue = (value as Record<string, unknown>).model || (value as Record<string, unknown>).modelName;
    pushModelName(models, modelValue);
  }
}

function getModelNames(row: GenerationEventRow) {
  const models: string[] = [];
  pushModelName(models, row.model);
  pushModelName(models, row.meta?.modelsUsed);
  pushModelName(models, row.meta?.models_used);
  pushModelName(models, row.meta?.models);
  pushModelName(models, row.meta?.modelNames);
  pushModelName(models, row.meta?.model_names);
  pushModelName(models, row.meta?.modelUsed);
  pushModelName(models, row.meta?.model_used);
  pushModelName(models, row.meta?.textModel);
  pushModelName(models, row.meta?.text_model);
  pushModelName(models, row.meta?.imageModel);
  pushModelName(models, row.meta?.image_model);

  return models;
}

function getModelDisplay(row: GenerationEventRow) {
  const models = getModelNames(row);
  return models.length ? models.join(', ') : 'Not recorded';
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
  if (Number.isFinite(cost) && cost > 0) return `$${cost.toFixed(4)} USD`;

  const estimate = estimateGenerationCostUsd(row.model, row.meta);
  return estimate ? `$${estimate.costUsd.toFixed(4)} USD` : 'Not tracked yet';
}

function getDateBoundary(value: string, endOfDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function filterRows(
  rows: GenerationEventRow[],
  filters: { tool: string; model: string; status: string; from: string; to: string }
) {
  const fromDate = getDateBoundary(filters.from);
  const toDate = getDateBoundary(filters.to, true);
  const selectedModel = filters.model.toLowerCase();

  return rows.filter((row) => {
    if (filters.tool && row.tool !== filters.tool) return false;
    if (selectedModel && !getModelNames(row).some((model) => model.toLowerCase() === selectedModel)) return false;
    if (filters.status === 'successful' && row.success === false) return false;
    if (filters.status === 'failed' && row.success !== false) return false;

    const createdAt = new Date(row.created_at);
    if (fromDate && createdAt < fromDate) return false;
    if (toDate && createdAt > toDate) return false;

    return true;
  });
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

export default async function TokenUsagePage({ searchParams }: TokenUsagePageProps) {
  const summary = await getTokenUsageSummary();
  const params = await Promise.resolve(searchParams || {});
  const filters = {
    tool: normalizeFilterValue(params.tool),
    model: normalizeFilterValue(params.model),
    status: normalizeFilterValue(params.status),
    from: normalizeFilterValue(params.from),
    to: normalizeFilterValue(params.to),
  };
  const filteredRows = filterRows(summary.rows, filters);
  const successfulRows = filteredRows.filter((row) => row.success !== false);
  const imageEvents = successfulRows.filter((row) => row.meta?.category === 'image' || row.tool.includes('image'));
  const knownCostRows = successfulRows.filter((row) => getCostEstimate(row) !== 'Not tracked yet');
  const modelCount = new Set(successfulRows.flatMap((row) => getModelNames(row))).size;
  const pricedModelCount = new Set(successfulRows.filter((row) => getModelPricingRule(row.model)).map((row) => row.model).filter(Boolean)).size;
  const totalAssets = successfulRows.reduce((total, row) => total + getAssetCount(row), 0);
  const toolOptions = Array.from(new Set(summary.rows.map((row) => row.tool).filter(Boolean))).sort();
  const modelOptions = Array.from(new Set(summary.rows.flatMap((row) => getModelNames(row)))).sort((a, b) => a.localeCompare(b));
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

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
      label: 'Cost estimates',
      value: formatNumber(knownCostRows.length),
      detail: `${formatNumber(pricedModelCount)} priced model${pricedModelCount === 1 ? '' : 's'} observed in recent events`,
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

      <section>
        <Card className="overflow-hidden rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Generation usage log</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recent rows from the existing <span className="font-mono text-xs">generation_events</span> table.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {activeFilterCount ? (
                  <Badge variant="outline" className="w-fit border-violet-200 bg-violet-50 text-violet-700">
                    {formatNumber(filteredRows.length)} filtered
                  </Badge>
                ) : null}
                <Badge variant="outline" className="w-fit">
                  Last 200 events
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {summary.fallback ? (
              <div className="p-6 text-sm text-muted-foreground">
                Token usage data is unavailable right now: {summary.fallbackReason || 'database unavailable'}.
              </div>
            ) : summary.rows.length ? (
              <>
                <form className="grid gap-3 border-b border-border bg-slate-50/70 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tool</span>
                    <select
                      name="tool"
                      defaultValue={filters.tool}
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                    >
                      <option value="">All tools</option>
                      {toolOptions.map((tool) => (
                        <option key={tool} value={tool}>{formatTool(tool)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model</span>
                    <select
                      name="model"
                      defaultValue={filters.model}
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                    >
                      <option value="">All models</option>
                      {modelOptions.map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date from</span>
                    <input
                      type="date"
                      name="from"
                      defaultValue={filters.from}
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date to</span>
                    <input
                      type="date"
                      name="to"
                      defaultValue={filters.to}
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
                    <select
                      name="status"
                      defaultValue={filters.status}
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                    >
                      <option value="">All statuses</option>
                      <option value="successful">Successful</option>
                      <option value="failed">Failed</option>
                    </select>
                  </label>
                  <div className="flex items-end gap-2">
                    <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90">
                      Apply
                    </button>
                    <a href="/token-usage" className="inline-flex h-9 items-center rounded-md border border-input bg-white px-3 text-sm font-medium text-muted-foreground shadow-xs transition hover:bg-slate-100">
                      Reset
                    </a>
                  </div>
                </form>

                {filteredRows.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Time (EST)</TableHead>
                        <TableHead>Tool</TableHead>
                        <TableHead>Event Group</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Models</TableHead>
                        <TableHead>Assets</TableHead>
                        <TableHead>Tokens</TableHead>
                        <TableHead className="pr-4">Estimated Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="pl-4 text-muted-foreground">{formatDateTime(row.created_at)}</TableCell>
                          <TableCell className="font-medium">{formatTool(row.tool)}</TableCell>
                          <TableCell>
                            {getEventGroupId(row) ? (
                              <Badge variant="outline" className="whitespace-normal break-all border-blue-200 bg-blue-50 font-mono text-[11px] leading-4 text-blue-700" title={getEventGroupId(row) || undefined}>
                                {formatEventGroup(row)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Standalone</span>
                            )}
                          </TableCell>
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
                          <TableCell className="max-w-[220px] font-mono text-xs leading-5 text-muted-foreground">{getModelDisplay(row)}</TableCell>
                          <TableCell>{formatNumber(getAssetCount(row))}</TableCell>
                          <TableCell className="text-muted-foreground">{getTokenEstimate(row)}</TableCell>
                          <TableCell className="pr-4 text-muted-foreground">{getCostEstimate(row)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-6 text-sm text-muted-foreground">
                    No generation events match those filters.
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">
                No generation events have been logged yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
