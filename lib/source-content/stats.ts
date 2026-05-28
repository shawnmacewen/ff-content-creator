import { decodeHtmlEntities } from '@/lib/source-content/body';

export type SourceContentFilters = {
  availableTags: string[];
  availableTypes: string[];
  availableAuthors: string[];
  availablePublishers: string[];
};

export type SourceContentSummary = {
  sourceCounts: Record<string, number>;
  publisherCounts: Record<string, number>;
  finraReviewedCount: number;
  lastSyncedAt: string | null;
  totalSourceContent: number;
};

export const emptySourceContentFilters: SourceContentFilters = {
  availableTags: [],
  availableTypes: [],
  availableAuthors: [],
  availablePublishers: [],
};

export const emptySourceContentSummary: SourceContentSummary = {
  sourceCounts: {},
  publisherCounts: {},
  finraReviewedCount: 0,
  lastSyncedAt: null,
  totalSourceContent: 0,
};

export function normalizeCachedFilters(value: any): SourceContentFilters {
  return {
    availableTags: Array.isArray(value?.availableTags) ? value.availableTags : [],
    availableTypes: Array.isArray(value?.availableTypes) ? value.availableTypes : [],
    availableAuthors: Array.isArray(value?.availableAuthors) ? value.availableAuthors : [],
    availablePublishers: Array.isArray(value?.availablePublishers) ? value.availablePublishers : [],
  };
}

export function normalizeCachedSummary(value: any): SourceContentSummary {
  return {
    sourceCounts: value?.sourceCounts && typeof value.sourceCounts === 'object' ? value.sourceCounts : {},
    publisherCounts: value?.publisherCounts && typeof value.publisherCounts === 'object' ? value.publisherCounts : {},
    finraReviewedCount: Number(value?.finraReviewedCount || 0),
    lastSyncedAt: value?.lastSyncedAt || null,
    totalSourceContent: Number(value?.totalSourceContent || 0),
  };
}

export function buildSourceStats(rows: any[]) {
  const availableTypes = new Set<string>();
  const availableAuthors = new Set<string>();
  const availablePublishers = new Set<string>();
  const availableTags = new Set<string>();
  const sourceCounts: Record<string, number> = {};
  const publisherCounts: Record<string, number> = {};
  let finraReviewedCount = 0;
  let lastSyncedAt: string | null = null;

  for (const row of rows) {
    const type = row.content_designation || row.type || null;
    if (type) availableTypes.add(String(type));
    if (row.author) availableAuthors.add(String(row.author));

    const sourceSystem = row.source_system || 'unknown';
    sourceCounts[sourceSystem] = (sourceCounts[sourceSystem] || 0) + 1;

    const publisher = row.publisher || (row.source_system === 'sample-seed' ? 'sample' : null);
    if (publisher) {
      availablePublishers.add(String(publisher));
      publisherCounts[publisher] = (publisherCounts[publisher] || 0) + 1;
    }

    if (row.finra_approved === true) finraReviewedCount += 1;

    const updatedAt = row.updated_at || row.created_at || null;
    if (updatedAt && (!lastSyncedAt || new Date(updatedAt).getTime() > new Date(lastSyncedAt).getTime())) {
      lastSyncedAt = updatedAt;
    }

    const tags = Array.isArray(row.tags) ? row.tags : [];
    for (const tag of tags) {
      const decoded = decodeHtmlEntities(String(tag || '')).trim();
      if (decoded) availableTags.add(decoded);
    }
  }

  return {
    filters: {
      availableTags: Array.from(availableTags).sort((a, b) => a.localeCompare(b)),
      availableTypes: Array.from(availableTypes).sort((a, b) => a.localeCompare(b)),
      availableAuthors: Array.from(availableAuthors).sort((a, b) => a.localeCompare(b)),
      availablePublishers: Array.from(availablePublishers).sort((a, b) => a.localeCompare(b)),
    },
    summary: {
      sourceCounts,
      publisherCounts,
      finraReviewedCount,
      lastSyncedAt,
      totalSourceContent: rows.length,
    },
  };
}
