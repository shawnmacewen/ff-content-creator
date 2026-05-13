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

function findArticleArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const direct =
    payload.results ||
    payload.data ||
    payload.items ||
    payload.articles ||
    payload.records;
  if (Array.isArray(direct)) return direct;

  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.length && typeof value[0] === 'object') return value as any[];
    if (value && typeof value === 'object') {
      const nested = findArticleArray(value);
      if (nested.length) return nested;
    }
  }

  return [];
}

export function mapAdvisorStreamSearchResults(
  payload: AdvisorStreamSearchResponse
): NormalizedSourceItem[] {
  const list = findArticleArray(payload);

  return list
    .map((item: any) => {
      const externalId = item.id || item.uuid || item._id;
      const title = item.headline || item.title || item?.files?.title || item?.files?.[0]?.title;
      const excerpt = item.summary || item.description || '';
      const body = item.content || excerpt || '';
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const categories = Array.isArray(item.categories) ? item.categories : [];

      if (!externalId || !title) return null;

      return {
        externalId,
        sourceSystem: 'advisorstream',
        type: 'article',
        title,
        body,
        excerpt,
        author: item.source_name || item.source || item.author || 'AdvisorStream',
        tags: [...categories, ...tags],
        publishedAt: item.publication_date || item.publishedAt || item.createdAt,
        url: item.articleUrl || item.url,
        imageUrl: item.imageUrl || item.image_url,
        metadata: { raw: item },
      } as NormalizedSourceItem;
    })
    .filter(Boolean) as NormalizedSourceItem[];
}
