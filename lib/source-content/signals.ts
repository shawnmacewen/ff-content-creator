import { getCanonicalBody } from '@/lib/source-content/body';

export type SourceContentSignalType =
  | 'topic'
  | 'timeliness'
  | 'content_opportunity'
  | 'source_quality'
  | 'generation_guidance';

export type SourceContentSignal = {
  id: string;
  type: SourceContentSignalType;
  label: string;
  reason: string;
  evidence: string;
  confidence: number;
  source: 'metadata_rule' | 'content_rule' | 'ai_classification';
};

const ALLOWED_SIGNAL_TYPES = new Set<SourceContentSignalType>([
  'topic',
  'timeliness',
  'content_opportunity',
  'source_quality',
  'generation_guidance',
]);

function safeArray(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function safeMetadata(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function clampConfidence(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.6;
  return Math.max(0.05, Math.min(0.99, Number(numeric.toFixed(2))));
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/^[•\-–—]\s*/, '')
    .trim()
    .slice(0, maxLength);
}

function makeSignal(
  type: SourceContentSignalType,
  label: string,
  reason: string,
  evidence: string,
  confidence: number,
  source: SourceContentSignal['source']
): SourceContentSignal | null {
  const cleanLabel = cleanText(label, 64);
  const cleanReason = cleanText(reason, 180);
  const cleanEvidence = cleanText(evidence, 220);
  if (!cleanLabel || !cleanReason || !cleanEvidence) return null;

  return {
    id: `${type}-${slug(cleanLabel)}`,
    type,
    label: cleanLabel,
    reason: cleanReason,
    evidence: cleanEvidence,
    confidence: clampConfidence(confidence),
    source,
  };
}

export function normalizeContentSignals(value: any): SourceContentSignal[] {
  const raw = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const normalized: SourceContentSignal[] = [];

  for (const item of raw) {
    const type = String(item?.type || '') as SourceContentSignalType;
    if (!ALLOWED_SIGNAL_TYPES.has(type)) continue;

    const signal = makeSignal(
      type,
      item?.label,
      item?.reason,
      item?.evidence,
      item?.confidence,
      item?.source === 'metadata_rule' || item?.source === 'content_rule' || item?.source === 'ai_classification'
        ? item.source
        : 'ai_classification'
    );
    if (!signal) continue;

    const key = `${signal.type}:${signal.label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(signal);
  }

  return normalized.slice(0, 12);
}

export function buildRuleBasedSignals(row: any): SourceContentSignal[] {
  const metadata = safeMetadata(row?.metadata);
  const bodyText = getCanonicalBody(row);
  const bodyWordCount = bodyText.split(/\s+/).filter(Boolean).length;
  const title = cleanText(row?.title || 'Untitled source', 140);
  const tags = safeArray(row?.tags);
  const categories = [...safeArray(row?.categories), ...safeArray(row?.sub_categories)];
  const filename = cleanText(row?.bas_content_filename || metadata?.extraPropertiesSelected?.BasContentFilename || row?.external_id || '', 160);
  const signals: SourceContentSignal[] = [];

  const firstTopic = tags[0] || categories[0];
  if (firstTopic) {
    const signal = makeSignal(
      'topic',
      firstTopic,
      'Provider metadata identifies this as a primary topic for the source.',
      `Tag/category: ${firstTopic}`,
      0.78,
      'metadata_rule'
    );
    if (signal) signals.push(signal);
  }

  if (row?.evergreen === true || metadata?.extraPropertiesSelected?.Evergreen === true) {
    const signal = makeSignal(
      'timeliness',
      'Evergreen',
      'Provider metadata marks this source as evergreen, so it is less dependent on recent market timing.',
      'Evergreen metadata is true.',
      0.9,
      'metadata_rule'
    );
    if (signal) signals.push(signal);
  }

  if (bodyWordCount < 100) {
    const signal = makeSignal(
      'source_quality',
      'Body needs review',
      'The stored article body is short, so generated output may have limited source grounding.',
      `Stored body has ${bodyWordCount} words.`,
      0.95,
      'content_rule'
    );
    if (signal) signals.push(signal);
  } else {
    const signal = makeSignal(
      'source_quality',
      'Readable body',
      'The source has enough article text to support preview, takeaways, and grounded generation.',
      `Stored body has ${bodyWordCount.toLocaleString()} words.`,
      0.88,
      'content_rule'
    );
    if (signal) signals.push(signal);
  }

  if (filename) {
    const signal = makeSignal(
      'source_quality',
      'Filename available',
      'The source includes a provider filename, which helps the team trace the original asset.',
      `Filename: ${filename}`,
      0.92,
      'metadata_rule'
    );
    if (signal) signals.push(signal);
  }

  if (row?.finra_approved === true || metadata?.extraPropertiesSelected?.FinraApproved === true) {
    const signal = makeSignal(
      'source_quality',
      'FINRA-reviewed metadata',
      'Provider metadata indicates a FINRA review flag is present for this source.',
      'FinraApproved metadata is true.',
      0.88,
      'metadata_rule'
    );
    if (signal) signals.push(signal);
  }

  if (row?.finra_letter_url || metadata?.extraPropertiesSelected?.FinraLetterUrl) {
    const signal = makeSignal(
      'source_quality',
      'FINRA letter available',
      'The source includes a FINRA letter URL, giving reviewers a traceable compliance artifact.',
      'FINRA letter URL is present.',
      0.92,
      'metadata_rule'
    );
    if (signal) signals.push(signal);
  }

  if (/\b(20\d{2}|q[1-4]|deadline|enrollment|tax season|election|rate decision|new rules?)\b/i.test(`${title} ${bodyText.slice(0, 2500)}`)) {
    const signal = makeSignal(
      'timeliness',
      'Needs date context',
      'The content appears to include date-sensitive language, so generated copy should preserve timing context.',
      cleanText(`${title} ${bodyText}`.match(/\b(20\d{2}|q[1-4]|deadline|enrollment|tax season|election|rate decision|new rules?)\b[^.]{0,110}/i)?.[0] || title, 180),
      0.74,
      'content_rule'
    );
    if (signal) signals.push(signal);
  }

  return normalizeContentSignals(signals);
}

export function mergeContentSignals(...groups: SourceContentSignal[][]): SourceContentSignal[] {
  return normalizeContentSignals(groups.flat()).sort((a, b) => b.confidence - a.confidence);
}

export function summarizeSignalsForPrompt(signals: SourceContentSignal[]) {
  const usable = normalizeContentSignals(signals).filter((signal) => signal.type !== 'source_quality').slice(0, 8);
  if (!usable.length) return '';

  return [
    'Explainable content signals:',
    ...usable.map((signal) => `- ${signal.type}: ${signal.label}. Why: ${signal.reason} Evidence: ${signal.evidence}`),
  ].join('\n');
}
