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
  options?: { query?: string; limit?: number; offset?: number; includeSourceFilter?: boolean }
): Promise<AdvisorStreamSearchResponse> {
  const base = config.apiBaseUrl.replace(/\/$/, '');
  const url = new URL(`${base}/wealth-management/advisor-content/v3/bas-content-api/articles/search`);

  url.searchParams.set('is_active', 'true');
  if (options?.includeSourceFilter !== false) {
    url.searchParams.set('filter', 'source_sort=Broadridge Advisor Content');
  }
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

function stripXml(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toPlainText(input: unknown): string {
  if (!input || typeof input !== 'string') return '';
  const str = input.trim();
  if (str.startsWith('<')) return stripXml(str);
  return str;
}

function coalescePublishedAt(item: any): string | undefined {
  const candidates = [
    item.publication_date,
    item.publishedAt,
    item.published_at,
    item.publishDate,
    item.publish_date,
    item.createdAt,
    item.created_at,
    item.updated_at,
    item?.extra_properties?.publication_date,
    item?.extra_properties?.published_at,
    item?.extra_properties?.publish_date,
    item?.extra_properties?.created_at,
    item?.extraProps?.publication_date,
    item?.extraProps?.published_at,
    item?.extraProps?.publish_date,
    item?.extraProps?.created_at,
    item?.effective_date,
    item?.Effective_date,
    item?.extra_properties?.effective_date,
    item?.extra_properties?.Effective_date,
    item?.extraProps?.effective_date,
    item?.extraProps?.Effective_date,
  ].filter(Boolean);

  for (const value of candidates) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return undefined;
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
      const externalId = item.id || item.uuid || item._id || item.articleId;
      const title = item.headline || item.title || item?.files?.title || item?.files?.[0]?.title;
      const excerptRaw = item.summary || item.description || item?.extraProps?.description || item?.extra_properties?.description || '';
      const bodyRaw = item.content || item?.extraProps?.content || item?.extra_properties?.content || excerptRaw || '';
      const excerpt = toPlainText(excerptRaw);
      const body = toPlainText(bodyRaw) || excerpt;
      const tags = Array.isArray(item.tags)
        ? item.tags
        : Array.isArray(item?.extraProps?.tags)
          ? item.extraProps.tags
          : Array.isArray(item?.extra_properties?.tags)
            ? item.extra_properties.tags
            : [];
      const categories = Array.isArray(item.categories)
        ? item.categories
        : Array.isArray(item?.extraProps?.categories)
          ? item.extraProps.categories
          : Array.isArray(item?.extra_properties?.categories)
            ? item.extra_properties.categories
            : [];

      if (!externalId || !title) return null;

      const publishedAt = coalescePublishedAt(item);

      const sourceName = String(item.source || item.source_sort || item.enterprise_names?.[0] || '');
      const normalizedSource = sourceName.trim().toLowerCase();
      const publisher =
        normalizedSource === 'broadridge advisor content'
          ? 'broadridge-forefield'
          : 'publisher-content';

      return {
        externalId,
        sourceSystem: 'advisorstream',
        publisher,
        type: 'article',
        title,
        body,
        excerpt,
        author: item.source_name || item.source || item.author || 'AdvisorStream',
        tags: [...categories, ...tags],
        publishedAt,
        url: item.articleUrl || item.article_url || item.url,
        imageUrl: item.imageUrl || item.image_url,
        metadata: {
          raw: item,
          publishedAtCandidate: publishedAt || null,
        },
      } as NormalizedSourceItem;
    })
    .filter(Boolean) as NormalizedSourceItem[];
}
