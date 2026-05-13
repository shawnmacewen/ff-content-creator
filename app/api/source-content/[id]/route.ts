import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('source_content')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Source content not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    title: data.title,
    body: data.body,
    excerpt: data.metadata?.excerpt || data.body?.slice(0, 220) || '',
    type: data.type,
    tags: data.tags || [],
    publishedAt: data.published_at || null,
    author: data.source_system === 'sample-seed' ? 'Sample' : (data.author || 'Unknown'),
    url: data.metadata?.url || null,
    imageUrl: data.metadata?.imageUrl || null,
    sourceSystem: data.source_system || null,
    publisher: data.publisher || (data.source_system === 'sample-seed' ? 'sample' : null),
  });
}
