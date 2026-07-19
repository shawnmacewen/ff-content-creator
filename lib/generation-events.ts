import { getSupabaseServerClient } from '@/lib/supabase/server';
import { estimateGenerationCostUsd } from '@/lib/model-pricing';

type GenerationTool =
  | 'generate-content'
  | 'echowrite'
  | 'content-upload'
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

function addModelName(models: string[], value: unknown) {
  if (!value) return;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed && !models.some((model) => model.toLowerCase() === trimmed.toLowerCase())) models.push(trimmed);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => addModelName(models, entry));
    return;
  }

  if (typeof value === 'object') {
    const modelValue = (value as Record<string, unknown>).model || (value as Record<string, unknown>).modelName;
    addModelName(models, modelValue);
  }
}

function normalizeEventModels(model: string | null | undefined, meta: Record<string, any> | undefined) {
  const models: string[] = [];
  addModelName(models, model);
  addModelName(models, meta?.modelsUsed);
  addModelName(models, meta?.models_used);
  addModelName(models, meta?.models);
  addModelName(models, meta?.modelNames);
  addModelName(models, meta?.model_names);
  addModelName(models, meta?.modelUsed);
  addModelName(models, meta?.model_used);
  addModelName(models, meta?.textModel);
  addModelName(models, meta?.text_model);
  addModelName(models, meta?.imageModel);
  addModelName(models, meta?.image_model);

  return models;
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
    textTokens: numberOrUndefined(inputDetails.textTokens ?? inputDetails.text_tokens),
    imageTokens: numberOrUndefined(inputDetails.imageTokens ?? inputDetails.image_tokens),
  });
  const normalizedOutputDetails = compactObject({
    textTokens: numberOrUndefined(outputDetails.textTokens ?? outputDetails.text_tokens),
    imageTokens: numberOrUndefined(outputDetails.imageTokens ?? outputDetails.image_tokens),
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
    inputTextTokens: 0,
    inputImageTokens: 0,
    outputTextTokens: 0,
    outputImageTokens: 0,
  };
  const seen = {
    inputTokens: false,
    outputTokens: false,
    totalTokens: false,
    reasoningTokens: false,
    cachedInputTokens: false,
    inputTextTokens: false,
    inputImageTokens: false,
    outputTextTokens: false,
    outputImageTokens: false,
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
    const tokenUsage = (normalized.tokenUsage || {}) as Record<string, any>;
    const inputDetails = (tokenUsage.inputTokenDetails || {}) as Record<string, unknown>;
    const outputDetails = (tokenUsage.outputTokenDetails || {}) as Record<string, unknown>;
    const inputTextTokens = numberOrUndefined(inputDetails.textTokens);
    const inputImageTokens = numberOrUndefined(inputDetails.imageTokens);
    const outputTextTokens = numberOrUndefined(outputDetails.textTokens);
    const outputImageTokens = numberOrUndefined(outputDetails.imageTokens);
    if (inputTextTokens !== undefined) {
      totals.inputTextTokens += inputTextTokens;
      seen.inputTextTokens = true;
    }
    if (inputImageTokens !== undefined) {
      totals.inputImageTokens += inputImageTokens;
      seen.inputImageTokens = true;
    }
    if (outputTextTokens !== undefined) {
      totals.outputTextTokens += outputTextTokens;
      seen.outputTextTokens = true;
    }
    if (outputImageTokens !== undefined) {
      totals.outputImageTokens += outputImageTokens;
      seen.outputImageTokens = true;
    }
  }

  const inputTokenDetails = compactObject({
    textTokens: seen.inputTextTokens ? totals.inputTextTokens : undefined,
    imageTokens: seen.inputImageTokens ? totals.inputImageTokens : undefined,
  });
  const outputTokenDetails = compactObject({
    textTokens: seen.outputTextTokens ? totals.outputTextTokens : undefined,
    imageTokens: seen.outputImageTokens ? totals.outputImageTokens : undefined,
  });
  const merged = compactObject({
    inputTokens: seen.inputTokens ? totals.inputTokens : undefined,
    outputTokens: seen.outputTokens ? totals.outputTokens : undefined,
    totalTokens: seen.totalTokens ? totals.totalTokens : undefined,
    reasoningTokens: seen.reasoningTokens ? totals.reasoningTokens : undefined,
    cachedInputTokens: seen.cachedInputTokens ? totals.cachedInputTokens : undefined,
    inputTokenDetails: Object.keys(inputTokenDetails).length ? inputTokenDetails : undefined,
    outputTokenDetails: Object.keys(outputTokenDetails).length ? outputTokenDetails : undefined,
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
  generationGroupId?: string | null;
  meta?: Record<string, any>;
}) {
  try {
    const supabase = getSupabaseServerClient();
    const assetCount = Math.max(1, Math.floor(Number(args.assetCount || 1)));
    const costEstimate = estimateGenerationCostUsd(args.model, args.meta);
    const modelsUsed = normalizeEventModels(args.model, args.meta);

    await supabase.from('generation_events').insert({
      tool: args.tool,
      content_type: args.contentType,
      success: args.success ?? true,
      model: args.model || null,
      meta: {
        ...(args.meta || {}),
        ...(args.generationGroupId ? { generationGroupId: args.generationGroupId } : {}),
        ...(costEstimate
          ? {
              estimatedCostUsd: costEstimate.costUsd,
              pricingModel: costEstimate.pricingModel,
              pricingSource: costEstimate.pricingSource,
              pricingUnit: costEstimate.pricingUnit,
            }
          : {}),
        ...(modelsUsed.length ? { modelsUsed } : {}),
        category: args.category || 'content',
        assetCount,
      },
    });
  } catch {
    // Metrics should never break generation flows.
  }
}
