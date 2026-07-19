import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { normalizeCachedFilters, normalizeCachedSummary } from '@/lib/source-content/stats';

function asCleanString(value: unknown, fallback = '') {
  return String(value || fallback).trim();
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function normalizeForCompare(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

async function readCachedFilters(supabase: ReturnType<typeof getSupabaseServerClient>) {
  const { data } = await supabase
    .from('source_content_stats')
    .select('value')
    .eq('key', 'source_filters')
    .maybeSingle();

  return normalizeCachedFilters(data?.value || {});
}

async function upsertSourceStats(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  payload: {
    author: string | null;
    contentDesignation: string;
    tags: string[];
  }
) {
  const now = new Date().toISOString();
  const [{ data: filterData }, { data: summaryData }] = await Promise.all([
    supabase.from('source_content_stats').select('value').eq('key', 'source_filters').maybeSingle(),
    supabase.from('source_content_stats').select('value').eq('key', 'source_summary').maybeSingle(),
  ]);

  const filters = normalizeCachedFilters(filterData?.value || {});
  const summary = normalizeCachedSummary(summaryData?.value || {});

  await Promise.all([
    supabase.from('source_content_stats').upsert({
      key: 'source_filters',
      value: {
        ...filters,
        availableTags: uniqueSorted([...filters.availableTags, ...payload.tags]),
        availableTypes: uniqueSorted([...filters.availableTypes, payload.contentDesignation]),
        availableAuthors: uniqueSorted([...filters.availableAuthors, payload.author || '']),
        availablePublishers: uniqueSorted([...filters.availablePublishers, 'custom-content']),
      },
      refreshed_at: now,
    }),
    supabase.from('source_content_stats').upsert({
      key: 'source_summary',
      value: {
        ...summary,
        sourceCounts: {
          ...summary.sourceCounts,
          'custom-upload': Number(summary.sourceCounts['custom-upload'] || 0) + 1,
        },
        publisherCounts: {
          ...summary.publisherCounts,
          'custom-content': Number(summary.publisherCounts['custom-content'] || 0) + 1,
        },
        totalSourceContent: Number(summary.totalSourceContent || 0) + 1,
        lastSyncedAt: now,
      },
      refreshed_at: now,
    }),
  ]);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const title = asCleanString(body?.title);
    const bodyText = asCleanString(body?.bodyText);
    const summary = asCleanString(body?.summary);
    const contentDesignation = asCleanString(body?.contentDesignation);
    const type = asCleanString(body?.type, contentDesignation);
    const tags = asStringArray(body?.tags).slice(0, 3);
    const author = asCleanString(body?.author) || null;
    const filename = asCleanString(body?.filename, 'custom-content.txt');
    const publishedAt = asCleanString(body?.publishedAt) || new Date().toISOString();
    const recommendedAudience = asCleanString(body?.recommendedAudience) || null;

    if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    if (bodyText.length < 40) return NextResponse.json({ error: 'Body text must be at least 40 characters.' }, { status: 400 });
    if (!contentDesignation) return NextResponse.json({ error: 'Content designation is required.' }, { status: 400 });
    if (!type) return NextResponse.json({ error: 'Type is required.' }, { status: 400 });
    if (tags.length < 1 || tags.length > 3) {
      return NextResponse.json({ error: 'Select between 1 and 3 tags.' }, { status: 400 });
    }

    const parsedPublishedAt = new Date(publishedAt);
    if (Number.isNaN(parsedPublishedAt.getTime())) {
      return NextResponse.json({ error: 'Published date is invalid.' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const filters = await readCachedFilters(supabase);
    const allowedTags = new Map(filters.availableTags.map((tag) => [normalizeForCompare(tag), tag]));
    const invalidTags = tags.filter((tag) => allowedTags.size && !allowedTags.has(normalizeForCompare(tag)));

    if (invalidTags.length) {
      return NextResponse.json({ error: `Tags must come from the existing tag list: ${invalidTags.join(', ')}` }, { status: 400 });
    }

    const normalizedTags = tags.map((tag) => allowedTags.get(normalizeForCompare(tag)) || tag);
    const externalId = `custom-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const insertPayload = {
      external_id: externalId,
      source_system: 'custom-upload',
      publisher: 'custom-content',
      type,
      content_designation: contentDesignation,
      title,
      body: bodyText,
      body_text: bodyText,
      body_format: 'plain',
      author,
      tags: normalizedTags,
      published_at: parsedPublishedAt.toISOString(),
      metadata: {
        excerpt: summary || bodyText.slice(0, 220),
        uploadSource: 'paste',
        originalFilename: filename,
        contentDesignation,
        extraPropertiesSelected: {
          BasContentId: externalId,
          BasContentFilename: filename,
          Format: 'Custom Content',
          FinraApproved: false,
          APContentType: type,
          Evergreen: null,
        },
      },
      bas_content_id: externalId,
      bas_content_filename: filename,
      content_format: 'Custom Content',
      finra_approved: false,
      ap_content_type: type,
      evergreen: null,
      key_takeaways: [],
      recommended_audience: recommendedAudience,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('source_content')
      .insert(insertPayload)
      .select('id,title,publisher,source_system,external_id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await upsertSourceStats(supabase, {
      author,
      contentDesignation,
      tags: normalizedTags,
    });

    return NextResponse.json({ ok: true, content: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save custom content.' }, { status: 500 });
  }
}
