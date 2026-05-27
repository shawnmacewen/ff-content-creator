import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('generation_events')
    .select('tool,content_type,success,created_at,meta');

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

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
}
