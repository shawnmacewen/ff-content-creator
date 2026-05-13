export interface AdvisorStreamArticleSummary {
  id: string;
  headline: string;
  summary?: string;
  publication_date?: string;
  source_name?: string;
  categories?: string[];
  tags?: string[];
}

export interface AdvisorStreamSearchResponse {
  total?: number;
  limit?: number;
  offset?: number;
  results?: AdvisorStreamArticleSummary[];
  data?: AdvisorStreamArticleSummary[];
  items?: AdvisorStreamArticleSummary[];
}

export interface NormalizedSourceItem {
  externalId: string;
  sourceSystem: string;
  type: string;
  title: string;
  body: string;
  excerpt?: string;
  author?: string;
  tags: string[];
  publishedAt?: string;
  url?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}
