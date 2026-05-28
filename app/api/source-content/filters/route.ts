import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { MOCK_SOURCE_CONTENT } from '@/lib/api/source-content-mock';
import { normalizeCachedFilters } from '@/lib/source-content/stats';

export async function GET() {
  const fallback = () => NextResponse.json({
    availableTags: Array.from(new Set(MOCK_SOURCE_CONTENT.flatMap((content) => content.tags))).sort((a, b) => a.localeCompare(b)),
    availableTypes: Array.from(new Set(MOCK_SOURCE_CONTENT.map((content) => content.type).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    availableAuthors: Array.from(new Set(MOCK_SOURCE_CONTENT.map((content) => content.author).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    availablePublishers: Array.from(new Set(MOCK_SOURCE_CONTENT.map((content) => content.publisher).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    fallback: true,
  });

  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('source_content_stats')
      .select('value,refreshed_at')
      .eq('key', 'source_filters')
      .maybeSingle();

    if (error) {
      return fallback();
    }

    if (!data?.value) return fallback();

    return NextResponse.json({
      ...normalizeCachedFilters(data.value),
      cached: true,
      refreshedAt: data.refreshed_at || null,
    });
  } catch {
    return fallback();
  }
}
