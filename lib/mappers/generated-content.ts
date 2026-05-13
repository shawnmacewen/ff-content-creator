import type { GeneratedContent } from '@/lib/types/content';

export function mapGeneratedContentRow(row: any): GeneratedContent {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    sourceContentIds: row.source_content_ids || row.sourceContentIds || [],
    prompt: row.prompt || '',
    tone: row.tone,
    status: row.status,
    versions: row.versions || [],
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapGeneratedContentRows(rows: any[] = []): GeneratedContent[] {
  return rows.map(mapGeneratedContentRow);
}
