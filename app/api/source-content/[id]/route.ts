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

  return NextResponse.json({
    id: data.id,
    title: data.title,
    body: canonicalBody,
    bodyText: data.body_text || canonicalBody || null,
    bodyXml: data.body_xml || data.metadata?.bodyXml || null,
    bodyFormat: getBodyFormat(data),
    excerpt: data.metadata?.excerpt || canonicalBody.slice(0, 220) || '',
    type: data.type,
    tags: data.tags || [],
    publishedAt: data.published_at || null,
    author: data.source_system === 'sample-seed' ? 'Sample' : (data.author || 'Unknown'),
    url: data.metadata?.url || null,
    imageUrl: data.metadata?.imageUrl || null,
    sourceSystem: data.source_system || null,
    publisher: data.publisher || (data.source_system === 'sample-seed' ? 'sample' : null),
    // Needed for client-side thumbnail extraction and content preview rendering.
    metadata: data.metadata || null,
  });
}
