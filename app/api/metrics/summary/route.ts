import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

function fallbackMetrics(reason?: string) {
  return NextResponse.json({
    ok: true,
    fallback: true,
    fallbackReason: reason || 'database-unavailable',
    totals: {
      lifetime: 0,
      generatedAssets: 0,
      generatedAssetsThisWeek: 0,
      generatedImages: 0,
      generatedImagesThisWeek: 0,
      byTool: {},
      byType: {},
      imageByType: {},
    },
  });
}

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const { data, error } = await (async () => {
      try {
        return await supabase
          .from('generation_events')
          .select('tool,content_type,success,created_at,meta')
          .order('created_at', { ascending: false })
          .limit(500)
          .abortSignal(controller.signal);
      } finally {
        clearTimeout(timeout);
      }
    })();

    if (error) return fallbackMetrics(error.message);

    const byType: Record<string, number> = {};
    const byTool: Record<string, number> = {};
    const imageByType: Record<string, number> = {};
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    let generatedAssets = 0;
    let generatedAssetsThisWeek = 0;
    let generatedImages = 0;
    let generatedImagesThisWeek = 0;

    for (const row of data || []) {
      if ((row as any).success === false) continue;

      const t = String((row as any).content_type || 'unknown');
      const tool = String((row as any).tool || 'unknown');
      const meta = ((row as any).meta || {}) as Record<string, any>;
      const assetCount = Math.max(1, Math.floor(Number(meta.assetCount || meta.asset_count || 1)));
      const createdAt = new Date((row as any).created_at || 0).getTime();
      const isThisWeek = Number.isFinite(createdAt) && createdAt >= weekAgo;
      const isImage = meta.category === 'image' || tool.includes('image') || t.includes('image');

      if (isImage) {
        generatedImages += assetCount;
        if (isThisWeek) generatedImagesThisWeek += assetCount;
        imageByType[t] = (imageByType[t] || 0) + assetCount;
      } else {
        generatedAssets += assetCount;
        if (isThisWeek) generatedAssetsThisWeek += assetCount;
        byType[t] = (byType[t] || 0) + assetCount;
        byTool[tool] = (byTool[tool] || 0) + assetCount;
      }
    }

    return NextResponse.json({
      ok: true,
      totals: {
        lifetime: generatedAssets,
        generatedAssets,
        generatedAssetsThisWeek,
        generatedImages,
        generatedImagesThisWeek,
        byTool,
        byType,
        imageByType,
      },
    });
  } catch (error: any) {
    return fallbackMetrics(error?.message);
  }
}
