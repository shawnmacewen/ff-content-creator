import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type TagAggregate = {
  count: number;
  variants: Map<string, number>;
};

function normalizeTag(tag: string) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function mostUsedVariant(variants: Map<string, number>) {
  return Array.from(variants.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || '';
}

function idleResponse() {
  return NextResponse.json({
    disabled: true,
    scanned: false,
    tags: [],
    summary: {
      uniqueTags: 0,
      totalTagUses: 0,
      taggedContentCount: 0,
      singleUseCount: 0,
      variantCount: 0,
    },
  });
}

export async function GET(request: NextRequest) {
  const shouldScan = request.nextUrl.searchParams.get('scan') === '1';
  if (!shouldScan) return idleResponse();

  const maxRows = Math.min(10000, Math.max(100, Number(request.nextUrl.searchParams.get('maxRows') || 10000)));
  const pageSize = 1000;
  const supabase = getSupabaseServerClient();
  const tagMap = new Map<string, TagAggregate>();
  let taggedContentCount = 0;
  let scannedRows = 0;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    for (let from = 0; from < maxRows; from += pageSize) {
      const to = Math.min(from + pageSize - 1, maxRows - 1);
      const { data, error } = await supabase
        .from('source_content')
        .select('id,tags')
        .order('created_at', { ascending: false })
        .range(from, to)
        .abortSignal(controller.signal);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const rows = data || [];
      scannedRows += rows.length;

      for (const row of rows) {
        const tags = Array.isArray((row as any).tags) ? (row as any).tags : [];
        if (tags.length) taggedContentCount += 1;

        for (const rawTag of tags) {
          const tag = String(rawTag || '').trim();
          const normalized = normalizeTag(tag);
          if (!normalized) continue;

          const aggregate = tagMap.get(normalized) || { count: 0, variants: new Map<string, number>() };
          aggregate.count += 1;
          aggregate.variants.set(tag, (aggregate.variants.get(tag) || 0) + 1);
          tagMap.set(normalized, aggregate);
        }
      }

      if (rows.length < pageSize) break;
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.name === 'AbortError' ? 'tag-scan-timeout' : (error?.message || 'tag-scan-failed') },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }

  const tags = Array.from(tagMap.entries())
    .map(([normalized, aggregate]) => {
      const variants = Array.from(aggregate.variants.keys()).sort((a, b) => a.localeCompare(b));
      const lowerVariantSet = new Set(variants.map((variant) => variant.toLowerCase()));

      return {
        tag: mostUsedVariant(aggregate.variants),
        normalized,
        count: aggregate.count,
        variants,
        hasCaseVariants: variants.length > lowerVariantSet.size,
      };
    })
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  return NextResponse.json({
    disabled: false,
    scanned: true,
    scannedRows,
    capped: scannedRows >= maxRows,
    tags,
    summary: {
      uniqueTags: tags.length,
      totalTagUses: tags.reduce((sum, tag) => sum + tag.count, 0),
      taggedContentCount,
      singleUseCount: tags.filter((tag) => tag.count === 1).length,
      variantCount: tags.filter((tag) => tag.variants.length > 1).length,
    },
  });
}
