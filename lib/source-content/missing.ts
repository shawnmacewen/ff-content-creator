export function normalizeSourceContentIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((id) => String(id || '').trim()).filter(Boolean)));
}

export function findMissingSourceContentIds(requestedIds: string[], rows: Array<{ id?: unknown }> | null | undefined) {
  const found = new Set((rows || []).map((row) => String(row.id || '')).filter(Boolean));
  return requestedIds.filter((id) => !found.has(id));
}

export function missingSourceContentMessage(missingCount: number, requestedCount: number) {
  if (requestedCount <= 0) return 'No source content was selected.';
  if (missingCount >= requestedCount) {
    return 'The selected source content is no longer available. It may have been deleted.';
  }
  return `${missingCount} selected source item${missingCount === 1 ? ' is' : 's are'} no longer available. Continuing with the remaining source content.`;
}
