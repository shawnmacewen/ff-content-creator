import { getSupabaseServerClient } from '@/lib/supabase/server';
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
    generatedImages: number;
    generatedImagesThisWeek: number;
    savedOutputs: number;
    byTool: Record<string, number>;
    byType: Record<string, number>;
    imageByType: Record<string, number>;
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
      generatedImages: 0,
      generatedImagesThisWeek: 0,
      savedOutputs: 0,
      byTool: {},
      byType: {},
      imageByType: {},
    },
  };
}

export async function getDashboardMetrics(): Promise<DashboardMetricsSummary> {
  try {
    const supabase = getSupabaseServerClient();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const [eventsResult, savedCountResult, sourceSummaryResult] = await Promise.all([
      supabase
        .from('generation_events')
        .select('tool,content_type,success,created_at,meta')
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
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    let generatedAssets = 0;
    let generatedAssetsThisWeek = 0;
    let generatedImages = 0;
    let generatedImagesThisWeek = 0;

    for (const row of eventsResult.data || []) {
      if ((row as any).success === false) continue;

      const type = String((row as any).content_type || 'unknown');
      const tool = String((row as any).tool || 'unknown');
      const meta = ((row as any).meta || {}) as Record<string, any>;
      const assetCount = Math.max(1, Math.floor(Number(meta.assetCount || meta.asset_count || 1)));
      const createdAt = new Date((row as any).created_at || 0).getTime();
      const isThisWeek = Number.isFinite(createdAt) && createdAt >= weekAgo;
      const isImage = meta.category === 'image' || tool.includes('image') || type.includes('image');

      if (isImage) {
        generatedImages += assetCount;
        if (isThisWeek) generatedImagesThisWeek += assetCount;
        imageByType[type] = (imageByType[type] || 0) + assetCount;
      } else {
        generatedAssets += assetCount;
        if (isThisWeek) generatedAssetsThisWeek += assetCount;
        byType[type] = (byType[type] || 0) + assetCount;
        byTool[tool] = (byTool[tool] || 0) + assetCount;
      }
    }

    const sourceSummary = normalizeCachedSummary(sourceSummaryResult.data?.value || emptySourceContentSummary);

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
        generatedImages,
        generatedImagesThisWeek,
        savedOutputs: savedCountResult.count || 0,
        byTool,
        byType,
        imageByType,
      },
    };
  } catch (error: any) {
    return emptyDashboardMetrics(error?.name === 'AbortError' ? 'metrics-timeout' : error?.message);
  }
}
