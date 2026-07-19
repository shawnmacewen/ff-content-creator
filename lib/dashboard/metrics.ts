import { getSupabaseServerClient } from '@/lib/supabase/server';
import { estimateGenerationCostUsd } from '@/lib/model-pricing';
import { emptySourceContentSummary, normalizeCachedSummary } from '@/lib/source-content/stats';

export type DashboardMetricsSummary = {
  fallback: boolean;
  fallbackReason?: string;
  source: {
    totalSourceContent: number;
    finraReviewedCount: number;
    refreshedAt: string | null;
  };
  totals: {
    lifetime: number;
    generatedAssets: number;
    generatedAssetsThisWeek: number;
    generatedAssetsPreviousWeek: number;
    generatedImages: number;
    generatedImagesThisWeek: number;
    generatedImagesPreviousWeek: number;
    savedOutputs: number;
    byTool: Record<string, number>;
    byType: Record<string, number>;
    imageByType: Record<string, number>;
  };
  daily: Array<{
    date: string;
    label: string;
    articles: number;
    images: number;
    total: number;
  }>;
  recentEvents: Array<{
    id: string;
    groupId: string;
    time: string;
    feature: string;
    models: string[];
    assets: number;
    totalTokens: number | null;
    estimatedCostUsd: number | null;
  }>;
  tokenSummary: {
    totalTokensThisWeek: number;
    estimatedCostThisWeek: number;
  };
};

export function emptyDashboardMetrics(reason?: string): DashboardMetricsSummary {
  return {
    fallback: true,
    fallbackReason: reason || 'database-unavailable',
    source: {
      totalSourceContent: 0,
      finraReviewedCount: 0,
      refreshedAt: null,
    },
    totals: {
      lifetime: 0,
      generatedAssets: 0,
      generatedAssetsThisWeek: 0,
      generatedAssetsPreviousWeek: 0,
      generatedImages: 0,
      generatedImagesThisWeek: 0,
      generatedImagesPreviousWeek: 0,
      savedOutputs: 0,
      byTool: {},
      byType: {},
      imageByType: {},
    },
    daily: buildEmptyDailySeries(),
    recentEvents: [],
    tokenSummary: {
      totalTokensThisWeek: 0,
      estimatedCostThisWeek: 0,
    },
  };
}

function buildEmptyDailySeries() {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      label: formatter.format(date),
      articles: 0,
      images: 0,
      total: 0,
    };
  });
}

function titleCase(value: string) {
  return value
    .replace(/_/g, '-')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getTokenValue(meta: Record<string, any>, key: 'input' | 'output' | 'total') {
  const values = key === 'input'
    ? [meta.inputTokens, meta.input_tokens, meta.tokenUsage?.inputTokens, meta.tokenUsage?.input_tokens]
    : key === 'output'
      ? [meta.outputTokens, meta.output_tokens, meta.tokenUsage?.outputTokens, meta.tokenUsage?.output_tokens]
      : [meta.totalTokens, meta.total_tokens, meta.tokenUsage?.totalTokens, meta.tokenUsage?.total_tokens, meta.tokens];
  const value = values.map(Number).find((entry) => Number.isFinite(entry) && entry > 0);
  return value ?? null;
}

function getEventGroupId(id: string, meta: Record<string, any>) {
  const value =
    meta.generationGroupId ||
    meta.generation_group_id ||
    meta.kitGenerationId ||
    meta.kit_generation_id ||
    meta.parentEventId ||
    meta.parent_event_id;

  return typeof value === 'string' && value.trim() ? value.trim() : id;
}

function pushUniqueValue(values: string[], value: unknown) {
  if (!value) return;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed && !values.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) values.push(trimmed);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => pushUniqueValue(values, entry));
    return;
  }

  if (typeof value === 'object') {
    const modelValue = (value as Record<string, unknown>).model || (value as Record<string, unknown>).modelName;
    pushUniqueValue(values, modelValue);
  }
}

function getModelNames(model: string, meta: Record<string, any>) {
  const models: string[] = [];
  pushUniqueValue(models, model);
  pushUniqueValue(models, meta.modelsUsed);
  pushUniqueValue(models, meta.models_used);
  pushUniqueValue(models, meta.models);
  pushUniqueValue(models, meta.modelNames);
  pushUniqueValue(models, meta.model_names);
  pushUniqueValue(models, meta.modelUsed);
  pushUniqueValue(models, meta.model_used);
  pushUniqueValue(models, meta.textModel);
  pushUniqueValue(models, meta.text_model);
  pushUniqueValue(models, meta.imageModel);
  pushUniqueValue(models, meta.image_model);

  return models.length ? models : ['Not recorded'];
}

export async function getDashboardMetrics(): Promise<DashboardMetricsSummary> {
  try {
    const supabase = getSupabaseServerClient();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const [eventsResult, savedCountResult, sourceSummaryResult] = await Promise.all([
      supabase
        .from('generation_events')
        .select('id,tool,content_type,success,created_at,model,meta')
        .order('created_at', { ascending: false })
        .limit(500)
        .abortSignal(controller.signal),
      supabase
        .from('generated_content')
        .select('id', { count: 'exact', head: true })
        .abortSignal(controller.signal),
      supabase
        .from('source_content_stats')
        .select('value,refreshed_at')
        .eq('key', 'source_summary')
        .abortSignal(controller.signal)
        .maybeSingle(),
    ]).finally(() => clearTimeout(timeout));

    const firstError = eventsResult.error || savedCountResult.error || sourceSummaryResult.error;
    if (firstError) return emptyDashboardMetrics(firstError.message);

    const byType: Record<string, number> = {};
    const byTool: Record<string, number> = {};
    const imageByType: Record<string, number> = {};
    const daily = buildEmptyDailySeries();
    const dailyByDate = new Map(daily.map((day) => [day.date, day]));
    const recentEventGroups = new Map<string, {
      id: string;
      groupId: string;
      time: string;
      timestamp: number;
      features: string[];
      models: string[];
      assets: number;
      totalTokens: number;
      hasTokenTotal: boolean;
      estimatedCostUsd: number;
      hasCostEstimate: boolean;
    }>();
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const previousWeekAgo = now - 14 * 24 * 60 * 60 * 1000;
    let generatedAssets = 0;
    let generatedAssetsThisWeek = 0;
    let generatedAssetsPreviousWeek = 0;
    let generatedImages = 0;
    let generatedImagesThisWeek = 0;
    let generatedImagesPreviousWeek = 0;
    let totalTokensThisWeek = 0;
    let estimatedCostThisWeek = 0;

    for (const row of eventsResult.data || []) {
      if ((row as any).success === false) continue;

      const type = String((row as any).content_type || 'unknown');
      const tool = String((row as any).tool || 'unknown');
      const meta = ((row as any).meta || {}) as Record<string, any>;
      const model = String((row as any).model || meta.modelUsed || meta.model_used || 'Not recorded');
      const id = String((row as any).id || `${tool}-${(row as any).created_at || ''}`);
      const groupId = getEventGroupId(id, meta);
      const assetCount = Math.max(1, Math.floor(Number(meta.assetCount || meta.asset_count || 1)));
      const createdAt = new Date((row as any).created_at || 0).getTime();
      const isThisWeek = Number.isFinite(createdAt) && createdAt >= weekAgo;
      const isPreviousWeek = Number.isFinite(createdAt) && createdAt >= previousWeekAgo && createdAt < weekAgo;
      const isImage = meta.category === 'image' || tool.includes('image') || type.includes('image');
      const day = Number.isFinite(createdAt) ? dailyByDate.get(new Date(createdAt).toISOString().slice(0, 10)) : null;
      const totalTokens = getTokenValue(meta, 'total');
      const storedCost = Number(meta.costUsd || meta.cost_usd || meta.estimatedCostUsd || meta.estimated_cost_usd);
      const estimatedCost = Number.isFinite(storedCost) && storedCost > 0
        ? storedCost
        : estimateGenerationCostUsd(model, meta)?.costUsd ?? null;

      if (isThisWeek) {
        if (totalTokens) totalTokensThisWeek += totalTokens;
        if (estimatedCost) estimatedCostThisWeek += estimatedCost;
      }

      const eventGroup = recentEventGroups.get(groupId) || {
        id: groupId,
        groupId,
        time: (row as any).created_at || '',
        timestamp: Number.isFinite(createdAt) ? createdAt : 0,
        features: [],
        models: [],
        assets: 0,
        totalTokens: 0,
        hasTokenTotal: false,
        estimatedCostUsd: 0,
        hasCostEstimate: false,
      };
      if (createdAt > eventGroup.timestamp) {
        eventGroup.timestamp = createdAt;
        eventGroup.time = (row as any).created_at || eventGroup.time;
      }
      pushUniqueValue(eventGroup.features, titleCase(tool));
      getModelNames(model, meta).forEach((entry) => pushUniqueValue(eventGroup.models, entry));
      eventGroup.assets += assetCount;
      if (totalTokens) {
        eventGroup.totalTokens += totalTokens;
        eventGroup.hasTokenTotal = true;
      }
      if (estimatedCost) {
        eventGroup.estimatedCostUsd += estimatedCost;
        eventGroup.hasCostEstimate = true;
      }
      recentEventGroups.set(groupId, eventGroup);

      if (isImage) {
        generatedImages += assetCount;
        if (isThisWeek) generatedImagesThisWeek += assetCount;
        if (isPreviousWeek) generatedImagesPreviousWeek += assetCount;
        imageByType[type] = (imageByType[type] || 0) + assetCount;
        if (day) {
          day.images += assetCount;
          day.total += assetCount;
        }
      } else {
        generatedAssets += assetCount;
        if (isThisWeek) generatedAssetsThisWeek += assetCount;
        if (isPreviousWeek) generatedAssetsPreviousWeek += assetCount;
        byType[type] = (byType[type] || 0) + assetCount;
        byTool[tool] = (byTool[tool] || 0) + assetCount;
        if (day) {
          day.articles += assetCount;
          day.total += assetCount;
        }
      }

    }

    const sourceSummary = normalizeCachedSummary(sourceSummaryResult.data?.value || emptySourceContentSummary);
    const recentEvents: DashboardMetricsSummary['recentEvents'] = Array.from(recentEventGroups.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 7)
      .map((group) => ({
        id: group.id,
        groupId: group.groupId,
        time: group.time,
        feature: group.features.length ? group.features.join(', ') : 'Not recorded',
        models: group.models.length ? group.models : ['Not recorded'],
        assets: group.assets,
        totalTokens: group.hasTokenTotal ? group.totalTokens : null,
        estimatedCostUsd: group.hasCostEstimate ? group.estimatedCostUsd : null,
      }));

    return {
      fallback: false,
      source: {
        totalSourceContent: sourceSummary.totalSourceContent,
        finraReviewedCount: sourceSummary.finraReviewedCount,
        refreshedAt: sourceSummaryResult.data?.refreshed_at || null,
      },
      totals: {
        lifetime: generatedAssets,
        generatedAssets,
        generatedAssetsThisWeek,
        generatedAssetsPreviousWeek,
        generatedImages,
        generatedImagesThisWeek,
        generatedImagesPreviousWeek,
        savedOutputs: savedCountResult.count || 0,
        byTool,
        byType,
        imageByType,
      },
      daily,
      recentEvents,
      tokenSummary: {
        totalTokensThisWeek,
        estimatedCostThisWeek,
      },
    };
  } catch (error: any) {
    return emptyDashboardMetrics(error?.name === 'AbortError' ? 'metrics-timeout' : error?.message);
  }
}
