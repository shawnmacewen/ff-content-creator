type UsageLike = Record<string, any> | null | undefined;

export type ModelPricingRule = {
  model: string;
  inputPerMillion?: number;
  cachedInputPerMillion?: number;
  outputPerMillion?: number;
  textInputPerMillion?: number;
  cachedTextInputPerMillion?: number;
  imageInputPerMillion?: number;
  cachedImageInputPerMillion?: number;
  imageOutputPerMillion?: number;
  source: string;
};

export type CostEstimate = {
  costUsd: number;
  pricingModel: string;
  pricingSource: string;
  pricingUnit: 'per_1m_tokens';
  pricingRate: ModelPricingRule;
};

const OPENAI_PRICING_SOURCE = 'OpenAI API pricing, checked 2026-07-18';

export const MODEL_PRICING_RULES: Record<string, ModelPricingRule> = {
  'gpt-5.6-sol': { model: 'gpt-5.6-sol', inputPerMillion: 5, cachedInputPerMillion: 0.5, outputPerMillion: 30, source: OPENAI_PRICING_SOURCE },
  'gpt-5.6-terra': { model: 'gpt-5.6-terra', inputPerMillion: 2.5, cachedInputPerMillion: 0.25, outputPerMillion: 15, source: OPENAI_PRICING_SOURCE },
  'gpt-5.6-luna': { model: 'gpt-5.6-luna', inputPerMillion: 1, cachedInputPerMillion: 0.1, outputPerMillion: 6, source: OPENAI_PRICING_SOURCE },
  'gpt-5.5': { model: 'gpt-5.5', inputPerMillion: 5, cachedInputPerMillion: 0.5, outputPerMillion: 30, source: OPENAI_PRICING_SOURCE },
  'gpt-5.5-pro': { model: 'gpt-5.5-pro', inputPerMillion: 30, outputPerMillion: 180, source: OPENAI_PRICING_SOURCE },
  'gpt-5.4': { model: 'gpt-5.4', inputPerMillion: 2.5, cachedInputPerMillion: 0.25, outputPerMillion: 15, source: OPENAI_PRICING_SOURCE },
  'gpt-5.4-mini': { model: 'gpt-5.4-mini', inputPerMillion: 0.75, cachedInputPerMillion: 0.075, outputPerMillion: 4.5, source: OPENAI_PRICING_SOURCE },
  'gpt-5.4-nano': { model: 'gpt-5.4-nano', inputPerMillion: 0.2, cachedInputPerMillion: 0.02, outputPerMillion: 1.25, source: OPENAI_PRICING_SOURCE },
  'gpt-5.4-pro': { model: 'gpt-5.4-pro', inputPerMillion: 30, outputPerMillion: 180, source: OPENAI_PRICING_SOURCE },
  'gpt-5.3-codex': { model: 'gpt-5.3-codex', inputPerMillion: 1.75, cachedInputPerMillion: 0.175, outputPerMillion: 14, source: OPENAI_PRICING_SOURCE },

  'gpt-4.1': { model: 'gpt-4.1', inputPerMillion: 2, cachedInputPerMillion: 0.5, outputPerMillion: 8, source: 'OpenAI API legacy pricing' },
  'gpt-4.1-mini': { model: 'gpt-4.1-mini', inputPerMillion: 0.4, cachedInputPerMillion: 0.1, outputPerMillion: 1.6, source: 'OpenAI API legacy pricing' },
  'gpt-4.1-nano': { model: 'gpt-4.1-nano', inputPerMillion: 0.1, cachedInputPerMillion: 0.025, outputPerMillion: 0.4, source: 'OpenAI API legacy pricing' },
  'gpt-4o': { model: 'gpt-4o', inputPerMillion: 2.5, cachedInputPerMillion: 1.25, outputPerMillion: 10, source: 'OpenAI API legacy pricing' },
  'gpt-4o-mini': { model: 'gpt-4o-mini', inputPerMillion: 0.15, cachedInputPerMillion: 0.075, outputPerMillion: 0.6, source: 'OpenAI API legacy pricing' },

  'gpt-image-2': {
    model: 'gpt-image-2',
    textInputPerMillion: 5,
    cachedTextInputPerMillion: 1.25,
    imageInputPerMillion: 8,
    cachedImageInputPerMillion: 2,
    imageOutputPerMillion: 30,
    source: OPENAI_PRICING_SOURCE,
  },
  'gpt-image-1.5': {
    model: 'gpt-image-1.5',
    textInputPerMillion: 5,
    cachedTextInputPerMillion: 1.25,
    imageInputPerMillion: 8,
    cachedImageInputPerMillion: 2,
    outputPerMillion: 10,
    imageOutputPerMillion: 32,
    source: OPENAI_PRICING_SOURCE,
  },
  'gpt-image-1-mini': {
    model: 'gpt-image-1-mini',
    textInputPerMillion: 2,
    cachedTextInputPerMillion: 0.2,
    imageInputPerMillion: 2.5,
    cachedImageInputPerMillion: 0.25,
    imageOutputPerMillion: 8,
    source: OPENAI_PRICING_SOURCE,
  },
  'gpt-image-1': {
    model: 'gpt-image-1',
    textInputPerMillion: 5,
    cachedTextInputPerMillion: 1.25,
    imageInputPerMillion: 10,
    cachedImageInputPerMillion: 2.5,
    imageOutputPerMillion: 40,
    source: 'OpenAI API legacy image pricing',
  },
};

function numberOrZero(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
}

export function normalizeModelName(model: string | null | undefined) {
  return String(model || '').trim().toLowerCase();
}

export function getModelPricingRule(model: string | null | undefined) {
  const normalized = normalizeModelName(model);
  if (!normalized) return null;

  if (MODEL_PRICING_RULES[normalized]) return MODEL_PRICING_RULES[normalized];

  const datedMatch = normalized.match(/^(gpt-(?:4\.1|4o|5\.\d+(?:-[a-z]+)?|image-\d(?:\.\d)?(?:-mini)?))-\d{4}-\d{2}-\d{2}$/);
  if (datedMatch?.[1] && MODEL_PRICING_RULES[datedMatch[1]]) return MODEL_PRICING_RULES[datedMatch[1]];

  return null;
}

export function estimateGenerationCostUsd(model: string | null | undefined, usage: UsageLike): CostEstimate | null {
  const rule = getModelPricingRule(model);
  if (!rule || !usage || typeof usage !== 'object') return null;

  const inputDetails = (usage.inputTokenDetails || usage.input_token_details || {}) as Record<string, unknown>;
  const outputDetails = (usage.outputTokenDetails || usage.output_token_details || {}) as Record<string, unknown>;
  const inputTokens = numberOrZero(usage.inputTokens ?? usage.input_tokens ?? usage.promptTokens ?? usage.prompt_tokens ?? usage.tokenUsage?.inputTokens);
  const outputTokens = numberOrZero(usage.outputTokens ?? usage.output_tokens ?? usage.completionTokens ?? usage.completion_tokens ?? usage.tokenUsage?.outputTokens);
  const cachedInputTokens = numberOrZero(usage.cachedInputTokens ?? usage.cached_input_tokens ?? inputDetails.cacheReadTokens ?? inputDetails.cache_read_tokens);
  const cacheWriteTokens = numberOrZero(inputDetails.cacheWriteTokens ?? inputDetails.cache_write_tokens);
  const textInputTokens = numberOrZero(inputDetails.textTokens ?? inputDetails.text_tokens);
  const imageInputTokens = numberOrZero(inputDetails.imageTokens ?? inputDetails.image_tokens);
  const imageOutputTokens = numberOrZero(outputDetails.imageTokens ?? outputDetails.image_tokens);
  const textOutputTokens = numberOrZero(outputDetails.textTokens ?? outputDetails.text_tokens);

  const cachedTextInputTokens = Math.min(cachedInputTokens, textInputTokens || cachedInputTokens);
  const cachedImageInputTokens = imageInputTokens && cachedInputTokens > cachedTextInputTokens
    ? Math.min(imageInputTokens, cachedInputTokens - cachedTextInputTokens)
    : 0;

  let costUsd = 0;

  if (rule.textInputPerMillion || rule.imageInputPerMillion || rule.imageOutputPerMillion) {
    const knownModalInputTokens = textInputTokens + imageInputTokens;
    const fallbackTextInputTokens = Math.max(0, inputTokens - knownModalInputTokens);
    const uncachedTextInputTokens = Math.max(0, textInputTokens + fallbackTextInputTokens - cachedTextInputTokens);
    const uncachedImageInputTokens = Math.max(0, imageInputTokens - cachedImageInputTokens);
    const fallbackImageOutputTokens = imageOutputTokens || Math.max(0, outputTokens - textOutputTokens);

    costUsd += (uncachedTextInputTokens / 1_000_000) * (rule.textInputPerMillion ?? rule.inputPerMillion ?? 0);
    costUsd += (cachedTextInputTokens / 1_000_000) * (rule.cachedTextInputPerMillion ?? rule.cachedInputPerMillion ?? rule.textInputPerMillion ?? rule.inputPerMillion ?? 0);
    costUsd += (uncachedImageInputTokens / 1_000_000) * (rule.imageInputPerMillion ?? rule.inputPerMillion ?? 0);
    costUsd += (cachedImageInputTokens / 1_000_000) * (rule.cachedImageInputPerMillion ?? rule.cachedInputPerMillion ?? rule.imageInputPerMillion ?? rule.inputPerMillion ?? 0);
    costUsd += (textOutputTokens / 1_000_000) * (rule.outputPerMillion ?? 0);
    costUsd += (fallbackImageOutputTokens / 1_000_000) * (rule.imageOutputPerMillion ?? rule.outputPerMillion ?? 0);
  } else {
    const uncachedInputTokens = Math.max(0, inputTokens - cachedInputTokens);
    costUsd += (uncachedInputTokens / 1_000_000) * (rule.inputPerMillion ?? 0);
    costUsd += (cachedInputTokens / 1_000_000) * (rule.cachedInputPerMillion ?? rule.inputPerMillion ?? 0);
    costUsd += (cacheWriteTokens / 1_000_000) * (rule.inputPerMillion ?? 0);
    costUsd += (outputTokens / 1_000_000) * (rule.outputPerMillion ?? 0);
  }

  if (!Number.isFinite(costUsd) || costUsd <= 0) return null;

  return {
    costUsd,
    pricingModel: rule.model,
    pricingSource: rule.source,
    pricingUnit: 'per_1m_tokens',
    pricingRate: rule,
  };
}
