import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function normalizeTag(input: string) {
  return decodeHtmlEntities(input)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function preferredDisplayTag(variants: Map<string, number>) {
  return Array.from(variants.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || 'unknown';
}

export async function GET() {
  const supabase = getSupabaseServerClient();
  const pageSize = 1000;
  let page = 0;
  const tagCounts = new Map<string, { count: number; variants: Map<string, number> }>();
  let taggedContentCount = 0;

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('source_content')
      .select('id,tags')
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data || [];
    for (const row of rows) {
      const tags = Array.isArray(row.tags) ? row.tags : [];
      const uniqueTagsForRow = new Set<string>();

      for (const rawTag of tags) {
        const display = decodeHtmlEntities(String(rawTag || '')).trim();
        const normalized = normalizeTag(display);
        if (!normalized) continue;

        uniqueTagsForRow.add(normalized);
        const current = tagCounts.get(normalized) || { count: 0, variants: new Map<string, number>() };
        current.count += 1;
        current.variants.set(display, (current.variants.get(display) || 0) + 1);
        tagCounts.set(normalized, current);
      }

      if (uniqueTagsForRow.size) taggedContentCount += 1;
    }

    if (rows.length < pageSize) break;
    page += 1;
  }

  const tags = Array.from(tagCounts.entries())
    .map(([normalized, entry]) => {
      const variants = Array.from(entry.variants.keys()).sort((a, b) => a.localeCompare(b));
      return {
        tag: preferredDisplayTag(entry.variants),
        normalized,
        count: entry.count,
        variants,
        hasCaseVariants: variants.length > 1,
      };
    })
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  const totalTagUses = tags.reduce((sum, tag) => sum + tag.count, 0);
  const singleUseCount = tags.filter((tag) => tag.count === 1).length;
  const variantCount = tags.filter((tag) => tag.hasCaseVariants).length;

  return NextResponse.json({
    tags,
    summary: {
      uniqueTags: tags.length,
      totalTagUses,
      taggedContentCount,
      singleUseCount,
      variantCount,
    },
  });
}
