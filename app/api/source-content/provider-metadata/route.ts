import { NextResponse } from 'next/server';
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

export async function GET() {
  const config = getAdvisorStreamConfig();
  if (!validateAdvisorStreamConfig(config)) {
    return NextResponse.json({ ok: false, error: 'AdvisorStream env vars are not fully configured' }, { status: 400 });
  }

  try {
    const token = await getAdvisorStreamAccessToken(config);

    const [categories, subcategories, sources, tags] = await Promise.all([
      fetchAdvisorStreamCategories(config, token),
      fetchAdvisorStreamSubcategories(config, token),
      fetchAdvisorStreamSources(config, token),
      fetchAdvisorStreamTags(config, token),
    ]);

    return NextResponse.json({ ok: true, categories, subcategories, sources, tags });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to fetch provider metadata' }, { status: 502 });
  }
}
