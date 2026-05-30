import { getSupabaseServerClient } from '@/lib/supabase/server';

type GenerationTool =
  | 'generate-content'
  | 'echowrite'
  | 'carousel-plan'
  | 'carousel-image'
  | 'ce-course-creator'
  | 'canadianizer'
  | 'image-generation'
  | 'image-test';

type GenerationCategory = 'content' | 'image';

export async function recordGenerationEvent(args: {
  tool: GenerationTool;
  contentType: string;
  success?: boolean;
  model?: string | null;
  category?: GenerationCategory;
  assetCount?: number;
  meta?: Record<string, any>;
}) {
  try {
    const supabase = getSupabaseServerClient();
    const assetCount = Math.max(1, Math.floor(Number(args.assetCount || 1)));

    await supabase.from('generation_events').insert({
      tool: args.tool,
      content_type: args.contentType,
      success: args.success ?? true,
      model: args.model || null,
      meta: {
        ...(args.meta || {}),
        category: args.category || 'content',
        assetCount,
      },
    });
  } catch {
    // Metrics should never break generation flows.
  }
}
