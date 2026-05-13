export interface AuditStructuredQuery {
  mustInclude: string[];
  mustExclude: string[];
  publisher?: string;
  limit?: number;
}

export interface AuditMatch {
  id: string;
  title: string;
  publisher: string | null;
  sourceSystem: string | null;
  publishedAt: string | null;
  snippet: string;
  score: number;
}
