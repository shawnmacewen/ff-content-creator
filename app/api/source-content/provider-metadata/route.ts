import { NextRequest, NextResponse } from 'next/server';
import {
  getAdvisorStreamAccessToken,
  getAdvisorStreamConfig,
  validateAdvisorStreamConfig,
} from '@/lib/integrations/advisorstream/provider';
import {
  fetchAdvisorStreamCategories,
  fetchAdvisorStreamSources,
  fetchAdvisorStreamSubcategories,
  fetchAdvisorStreamTags,
} from '@/lib/integrations/advisorstream/metadata';

async function providerGet(token: string, baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/$/, '');
  const response = await fetch(`${base}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Provider request failed (${response.status}) ${path}: ${body}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  const config = getAdvisorStreamConfig();
  if (!validateAdvisorStreamConfig(config)) {
    return NextResponse.json({ ok: false, error: 'AdvisorStream env vars are not fully configured' }, { status: 400 });
  }

  const mode = request.nextUrl.searchParams.get('mode') || 'all';
  const articleId = request.nextUrl.searchParams.get('articleId') || request.nextUrl.searchParams.get('id') || '';

  try {
    const token = await getAdvisorStreamAccessToken(config);

    if (mode === 'categories') {
      const categories = await fetchAdvisorStreamCategories(config, token);
      return NextResponse.json({ ok: true, mode, categories });
    }
    if (mode === 'subcategories') {
      const subcategories = await fetchAdvisorStreamSubcategories(config, token);
      return NextResponse.json({ ok: true, mode, subcategories });
    }
    if (mode === 'sources') {
      const sources = await fetchAdvisorStreamSources(config, token);
      return NextResponse.json({ ok: true, mode, sources });
    }
    if (mode === 'tags') {
      const tags = await fetchAdvisorStreamTags(config, token);
      return NextResponse.json({ ok: true, mode, tags });
    }
    if (mode === 'article') {
      if (!articleId) {
        return NextResponse.json({ ok: false, error: 'Missing articleId for mode=article' }, { status: 400 });
      }
      const article = await providerGet(
        token,
        config.apiBaseUrl,
        `/wealth-management/advisor-content/v3/bas-content-api/articles/${encodeURIComponent(articleId)}`
      );
      return NextResponse.json({ ok: true, mode, articleId, article });
    }

    const [categories, subcategories, sources, tags] = await Promise.all([
      fetchAdvisorStreamCategories(config, token),
      fetchAdvisorStreamSubcategories(config, token),
      fetchAdvisorStreamSources(config, token),
      fetchAdvisorStreamTags(config, token),
    ]);

    return NextResponse.json({ ok: true, mode: 'all', categories, subcategories, sources, tags });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to fetch provider metadata' }, { status: 502 });
  }
}
