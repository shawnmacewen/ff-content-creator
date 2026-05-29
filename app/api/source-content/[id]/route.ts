import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { MOCK_SOURCE_CONTENT } from '@/lib/api/source-content-mock';
import { getBodyFormat, getCanonicalBody } from '@/lib/source-content/body';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  const { data, error } = await (async () => {
    try {
      return await supabase
        .from('source_content')
        .select('*')
        .eq('id', id)
        .abortSignal(controller.signal)
        .single();
    } catch {
      return { data: null, error: { message: 'database-timeout' } };
    } finally {
      clearTimeout(timeout);
    }
  })();

  if (error || !data) {
    const fallback = MOCK_SOURCE_CONTENT.find((content) => content.id === id);
    if (fallback) return NextResponse.json(fallback);

    return NextResponse.json({ error: 'Source content not found' }, { status: 404 });
  }

  const canonicalBody = getCanonicalBody(data);

  const metadata = data.metadata || {};
  const extraPropertiesSelected = metadata?.extraPropertiesSelected || {};
  const contentDesignation = data.content_designation ?? metadata?.contentDesignation ?? data.type ?? null;

  return NextResponse.json({
    id: data.id,
    title: data.title,
    body: canonicalBody,
    bodyText: data.body_text || canonicalBody || null,
    bodyXml: data.body_xml || data.metadata?.bodyXml || null,
    bodyFormat: getBodyFormat(data),
    excerpt: data.metadata?.excerpt || canonicalBody.slice(0, 220) || '',
    type: contentDesignation,
    tags: data.tags || [],
    publishedAt: data.published_at || null,
    author: data.source_system === 'sample-seed' ? 'Sample' : (data.author || 'Unknown'),
    url: data.metadata?.url || null,
    imageUrl: data.metadata?.imageUrl || null,
    sourceSystem: data.source_system || null,
    publisher: data.publisher || (data.source_system === 'sample-seed' ? 'sample' : null),
    externalId: data.external_id || null,
    // Needed for client-side thumbnail extraction and content preview rendering.
    metadata: {
      ...metadata,
      contentDesignation,
      categories: data.categories ?? metadata.categories ?? [],
      subCategories: data.sub_categories ?? metadata.subCategories ?? [],
      extraPropertiesSelected: {
        ...extraPropertiesSelected,
        BasContentId: data.bas_content_id ?? extraPropertiesSelected.BasContentId ?? null,
        BasContentFilename: data.bas_content_filename ?? extraPropertiesSelected.BasContentFilename ?? null,
        Format: data.content_format ?? extraPropertiesSelected.Format ?? null,
        FinraLetterUrl: data.finra_letter_url ?? extraPropertiesSelected.FinraLetterUrl ?? null,
        FinraApproved: data.finra_approved ?? extraPropertiesSelected.FinraApproved ?? null,
        APContentType: data.ap_content_type ?? extraPropertiesSelected.APContentType ?? null,
        Evergreen: data.evergreen ?? extraPropertiesSelected.Evergreen ?? null,
      },
    },
  });
}
