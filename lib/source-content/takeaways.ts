import { getCanonicalBody } from '@/lib/source-content/body';

export type TakeawayEnrichmentStatus = 'ready' | 'needs_enrichment' | 'skipped_short_body' | 'failed';

export type TakeawayEnrichment = {
  status: TakeawayEnrichmentStatus;
  label: string;
  reason: string;
  updatedAt?: string | null;
  wordCount?: number | null;
};

export function countBodyWords(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => /\w/.test(word)).length;
}

function safeMetadata(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function labelForStatus(status: TakeawayEnrichmentStatus) {
  if (status === 'ready') return 'Takeaways ready';
  if (status === 'skipped_short_body') return 'Skipped: short body';
  if (status === 'failed') return 'Failed';
  return 'Needs enrichment';
}

export function buildTakeawayStatus(row: any): TakeawayEnrichment {
  const metadata = safeMetadata(row?.metadata);
  const stored = safeMetadata(metadata.takeawaysEnrichment);
  const keyTakeaways = Array.isArray(row?.key_takeaways ?? row?.keyTakeaways)
    ? (row.key_takeaways ?? row.keyTakeaways).map((item: any) => String(item || '').trim()).filter(Boolean)
    : [];
  const recommendedAudience = String(row?.recommended_audience ?? row?.recommendedAudience ?? '').trim();

  if (keyTakeaways.length >= 2 && recommendedAudience) {
    return {
      status: 'ready',
      label: labelForStatus('ready'),
      reason: 'Stored key takeaways and recommended audience are available.',
      updatedAt: stored.updatedAt || null,
      wordCount: typeof stored.wordCount === 'number' ? stored.wordCount : null,
    };
  }

  if (stored.status === 'failed') {
    return {
      status: 'failed',
      label: labelForStatus('failed'),
      reason: String(stored.reason || 'The last takeaway enrichment attempt failed.'),
      updatedAt: stored.updatedAt || null,
      wordCount: typeof stored.wordCount === 'number' ? stored.wordCount : null,
    };
  }

  const hasBodyText = Boolean(row?.body_text || row?.body || row?.bodyText);
  const bodyWordCount = hasBodyText ? countBodyWords(getCanonicalBody(row)) : 0;
  if (stored.status === 'skipped_short_body' || (hasBodyText && bodyWordCount < 100)) {
    return {
      status: 'skipped_short_body',
      label: labelForStatus('skipped_short_body'),
      reason: String(stored.reason || `Body has fewer than 100 words (${bodyWordCount}).`),
      updatedAt: stored.updatedAt || null,
      wordCount: typeof stored.wordCount === 'number' ? stored.wordCount : bodyWordCount,
    };
  }

  return {
    status: 'needs_enrichment',
    label: labelForStatus('needs_enrichment'),
    reason: String(stored.reason || 'Key takeaways have not been generated for this source yet.'),
    updatedAt: stored.updatedAt || null,
    wordCount: typeof stored.wordCount === 'number' ? stored.wordCount : (hasBodyText ? bodyWordCount : null),
  };
}

export function takeawayMetadata(status: TakeawayEnrichmentStatus, reason: string, wordCount?: number | null) {
  return {
    status,
    label: labelForStatus(status),
    reason,
    wordCount: typeof wordCount === 'number' ? wordCount : null,
    updatedAt: new Date().toISOString(),
  };
}
