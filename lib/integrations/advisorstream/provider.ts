import type {
  AdvisorStreamSearchResponse,
  NormalizedSourceItem,
} from './types';

export interface AdvisorStreamConfig {
  apiBaseUrl: string;
  oauthTokenUrl: string;
  clientId: string;
  clientSecret: string;
  oauthScope?: string;
}

export function getAdvisorStreamConfig(): AdvisorStreamConfig {
  const apiBaseUrl = process.env.ADVISORSTREAM_API_BASE_URL || '';
  const oauthTokenUrl = process.env.ADVISORSTREAM_OAUTH_TOKEN_URL || '';
  const clientId = process.env.ADVISORSTREAM_CLIENT_ID || '';
  const clientSecret = process.env.ADVISORSTREAM_CLIENT_SECRET || '';
  const oauthScope = process.env.ADVISORSTREAM_OAUTH_SCOPE || '';

  return { apiBaseUrl, oauthTokenUrl, clientId, clientSecret, oauthScope };
}

export function validateAdvisorStreamConfig(config: AdvisorStreamConfig) {
  return (
    !!config.apiBaseUrl &&
    !!config.oauthTokenUrl &&
    !!config.clientId &&
    !!config.clientSecret
  );
}

export async function getAdvisorStreamAccessToken(config: AdvisorStreamConfig): Promise<string> {
  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const params = new URLSearchParams({ grant_type: 'client_credentials' });
  params.set('client_id', config.clientId);
  if (config.oauthScope) params.set('scope', config.oauthScope);

  const response = await fetch(config.oauthTokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AdvisorStream token request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error('AdvisorStream token response missing access_token');
  }

  return payload.access_token;
}

export async function searchAdvisorStreamArticles(
  config: AdvisorStreamConfig,
  token: string,
  options?: { query?: string; limit?: number; offset?: number }
): Promise<AdvisorStreamSearchResponse> {
  const base = config.apiBaseUrl.replace(/\/$/, '');
  const url = new URL(`${base}/wealth-management/advisor-content/v3/bas-content-api/articles/search`);

  // Opinionated defaults based on working Postman collection
  url.searchParams.set('is_active', 'true');
  url.searchParams.set('filter', 'source_sort=Broadridge Advisor Content');
  url.searchParams.set(
    'fields',
    'uuid,files.title,description,articleUrl,content,tags,categories,subCategories,extraProps'
  );

  url.searchParams.set('limit', String(options?.limit ?? 25));
  url.searchParams.set('offset', String(options?.offset ?? 0));
  if (options?.query) url.searchParams.set('search', options.query);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AdvisorStream article search failed (${response.status}): ${body}`);
  }

  return (await response.json()) as AdvisorStreamSearchResponse;
}

export function mapAdvisorStreamSearchResults(
  payload: AdvisorStreamSearchResponse
): NormalizedSourceItem[] {
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
