import type { GeneratedContent } from '@/lib/types/content';

export function mapGeneratedContentRow(row: any): GeneratedContent {
  const versions = Array.isArray(row.generated_content_versions)
    ? row.generated_content_versions
      .map((version: any) => ({
        id: version.id,
        content: version.content || '',
        note: version.note || '',
        createdAt: version.created_at || version.createdAt || new Date().toISOString(),
      }))
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : row.versions || [];

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    sourceContentIds: row.source_content_ids || row.sourceContentIds || [],
    prompt: row.prompt || '',
    tone: row.tone,
    status: row.status,
    versions,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapGeneratedContentRows(rows: any[] = []): GeneratedContent[] {
  return rows.map(mapGeneratedContentRow);
}
