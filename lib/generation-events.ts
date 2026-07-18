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

type UsageLike = Record<string, any> | null | undefined;

function numberOrUndefined(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : undefined;
}

function compactObject(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null)
  );
}

export function normalizeGenerationUsage(usage: UsageLike) {
  if (!usage || typeof usage !== 'object') return {};

  const inputDetails = (usage.inputTokenDetails || usage.input_token_details || {}) as Record<string, unknown>;
  const outputDetails = (usage.outputTokenDetails || usage.output_token_details || {}) as Record<string, unknown>;
  const inputTokens = numberOrUndefined(usage.inputTokens ?? usage.input_tokens ?? usage.promptTokens ?? usage.prompt_tokens);
  const outputTokens = numberOrUndefined(usage.outputTokens ?? usage.output_tokens ?? usage.completionTokens ?? usage.completion_tokens);
  const totalTokens = numberOrUndefined(usage.totalTokens ?? usage.total_tokens ?? usage.tokens)
    ?? (inputTokens !== undefined || outputTokens !== undefined ? (inputTokens || 0) + (outputTokens || 0) : undefined);
  const reasoningTokens = numberOrUndefined(
    outputDetails.reasoningTokens ?? outputDetails.reasoning_tokens ?? usage.reasoningTokens ?? usage.reasoning_tokens
  );
  const cachedInputTokens = numberOrUndefined(
    inputDetails.cacheReadTokens ?? inputDetails.cache_read_tokens ?? usage.cachedInputTokens ?? usage.cached_input_tokens
  );

  const normalizedInputDetails = compactObject({
    noCacheTokens: numberOrUndefined(inputDetails.noCacheTokens ?? inputDetails.no_cache_tokens),
    cacheReadTokens: cachedInputTokens,
    cacheWriteTokens: numberOrUndefined(inputDetails.cacheWriteTokens ?? inputDetails.cache_write_tokens),
  });
  const normalizedOutputDetails = compactObject({
    textTokens: numberOrUndefined(outputDetails.textTokens ?? outputDetails.text_tokens),
    reasoningTokens,
  });
  const tokenUsage = compactObject({
    inputTokens,
    outputTokens,
    totalTokens,
    reasoningTokens,
    cachedInputTokens,
    inputTokenDetails: Object.keys(normalizedInputDetails).length ? normalizedInputDetails : undefined,
    outputTokenDetails: Object.keys(normalizedOutputDetails).length ? normalizedOutputDetails : undefined,
  });

  if (!Object.keys(tokenUsage).length) return {};

  return compactObject({
    inputTokens,
    outputTokens,
    totalTokens,
    reasoningTokens,
    cachedInputTokens,
    tokenUsage,
    rawUsage: usage.raw,
  });
}

export function mergeGenerationUsages(usages: UsageLike[]) {
  const totals = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    reasoningTokens: 0,
    cachedInputTokens: 0,
  };
  const seen = {
    inputTokens: false,
    outputTokens: false,
    totalTokens: false,
    reasoningTokens: false,
    cachedInputTokens: false,
  };

  for (const usage of usages) {
    const normalized = normalizeGenerationUsage(usage);
    for (const key of Object.keys(totals) as Array<keyof typeof totals>) {
      const value = numberOrUndefined(normalized[key]);
      if (value !== undefined) {
        totals[key] += value;
        seen[key] = true;
      }
    }
  }

  const merged = compactObject({
    inputTokens: seen.inputTokens ? totals.inputTokens : undefined,
    outputTokens: seen.outputTokens ? totals.outputTokens : undefined,
    totalTokens: seen.totalTokens ? totals.totalTokens : undefined,
    reasoningTokens: seen.reasoningTokens ? totals.reasoningTokens : undefined,
    cachedInputTokens: seen.cachedInputTokens ? totals.cachedInputTokens : undefined,
  });

  return Object.keys(merged).length ? { ...merged, tokenUsage: merged } : {};
}

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
