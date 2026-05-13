import type { AdvisorStreamSearchResponse, NormalizedSourceItem } from './types';

export interface AdvisorStreamConfig {
  apiBaseUrl: string;
  oauthTokenUrl: string;
  clientId: string;
  clientSecret: string;
}

export function getAdvisorStreamConfig(): AdvisorStreamConfig {
  const apiBaseUrl = process.env.ADVISORSTREAM_API_BASE_URL || '';
  const oauthTokenUrl = process.env.ADVISORSTREAM_OAUTH_TOKEN_URL || '';
  const clientId = process.env.ADVISORSTREAM_CLIENT_ID || '';
  const clientSecret = process.env.ADVISORSTREAM_CLIENT_SECRET || '';

  return { apiBaseUrl, oauthTokenUrl, clientId, clientSecret };
}

export function mapAdvisorStreamSearchResults(payload: AdvisorStreamSearchResponse): NormalizedSourceItem[] {
  return (payload.results || []).map((item) => ({
    externalId: item.id,
    sourceSystem: 'advisorstream',
    type: 'article',
    title: item.headline,
    body: item.summary || '',
    excerpt: item.summary || '',
    author: item.source_name || 'AdvisorStream',
    tags: [...(item.categories || []), ...(item.tags || [])],
    publishedAt: item.publication_date,
    metadata: { raw: item },
  }));
}
