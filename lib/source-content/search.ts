import type { SourceContent } from '@/lib/types/content';

export type SourceContentSearchScope = 'all' | 'title' | 'filename';

export function normalizeSourceSearchValue(value: unknown) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function safeMetadata(content: SourceContent) {
  const metadata = content.metadata;
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) return metadata;
  return {};
}

export function getSourceFilenameText(content: SourceContent) {
  const metadata = safeMetadata(content);
  const extraPropertiesSelected = metadata.extraPropertiesSelected || {};
  const extraProperties = metadata.extraProperties || {};
  const rawExtraProperties = metadata.raw?.extraProperties || {};

  return [
    content.externalId,
    extraPropertiesSelected.BasContentFilename,
    extraPropertiesSelected.BasContentId,
    extraProperties.BasContentFilename,
    extraProperties.BasContentId,
    rawExtraProperties.BasContentFilename,
    rawExtraProperties.BasContentId,
  ].filter(Boolean).join(' ');
}

export function buildSourceContentSearchText(
  content: SourceContent,
  searchScope: SourceContentSearchScope = 'all'
) {
  if (searchScope === 'title') return content.title || '';
  if (searchScope === 'filename') return getSourceFilenameText(content);

  const metadata = safeMetadata(content);
  const signals = Array.isArray(content.contentSignals)
    ? content.contentSignals.map((signal) => [signal.label, signal.reason, signal.evidence].filter(Boolean).join(' ')).join(' ')
    : '';

  return [
    content.title,
    content.excerpt,
    content.type,
    content.publisher,
    content.externalId,
    getSourceFilenameText(content),
    Array.isArray(content.tags) ? content.tags.join(' ') : '',
    Array.isArray(content.keyTakeaways) ? content.keyTakeaways.join(' ') : '',
    content.recommendedAudience,
    signals,
    Array.isArray(metadata.categories) ? metadata.categories.join(' ') : '',
    Array.isArray(metadata.subCategories) ? metadata.subCategories.join(' ') : '',
    metadata.excerpt,
  ].filter(Boolean).join(' ');
}

export function sourceContentMatchesQuery(
  content: SourceContent,
  query: string,
  searchScope: SourceContentSearchScope = 'all'
) {
  const normalizedQuery = normalizeSourceSearchValue(query);
  if (!normalizedQuery) return true;

  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const haystack = normalizeSourceSearchValue(buildSourceContentSearchText(content, searchScope));
  return haystack.includes(normalizedQuery) || queryTerms.every((term) => haystack.includes(term));
}
