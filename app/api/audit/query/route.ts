import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { parseSearchPrompt } from '@/lib/audit/search-parser';
import { decodeHtmlEntities, findMatchedTerms, makeSnippet, normalizeSourceText, scoreTextMatch, splitTerms } from '@/lib/audit/text';
import { getCanonicalBody } from '@/lib/source-content/body';

type SearchScope = 'all' | 'title' | 'filename' | 'body' | 'metadata';

const SOURCE_SEARCH_COLUMNS = 'id,title,body_text,body,publisher,source_system,published_at,external_id,type,metadata,tags,bas_content_id,bas_content_filename,key_takeaways,recommended_audience,categories,sub_categories';
const SOURCE_SEARCH_LIMIT = 5000;
const SOURCE_SEARCH_BATCH_SIZE = 1000;

function safeArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function safeMeta(row: any) {
  return row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
}

function searchableFilename(row: any) {
  const metadata = safeMeta(row);
  const extra = metadata.extraPropertiesSelected || metadata.extraProperties || {};
  return [
    row.bas_content_filename,
    row.bas_content_id,
    row.external_id,
    extra.BasContentFilename,
    extra.BasContentId,
  ].filter(Boolean).join('\n');
}

function searchableMeta(row: any) {
  const metadata = safeMeta(row);
  return [
    metadata.excerpt,
    row.recommended_audience,
    ...safeArray(row.key_takeaways),
    ...safeArray(row.tags),
    ...safeArray(row.categories),
    ...safeArray(row.sub_categories),
  ].filter(Boolean).join('\n');
}

function scopeFields(scope: SearchScope, fields: Record<SearchScope, string>) {
  if (scope === 'all') {
    return {
      haystack: [fields.title, fields.filename, fields.metadata, fields.body].filter(Boolean).join('\n'),
    };
  }

  return {
    haystack: fields[scope] || '',
  };
}

function matchedFields(fields: Record<SearchScope, string>, includeTerms: string[], searchScope: SearchScope) {
  const entries: Array<[SearchScope, string]> = searchScope === 'all'
    ? [['title', fields.title], ['filename', fields.filename], ['metadata', fields.metadata], ['body', fields.body]]
    : [[searchScope, fields[searchScope]]];

  return entries
    .filter(([, value]) => findMatchedTerms(value, includeTerms).length > 0)
    .map(([field]) => field);
}

function fieldLabel(field: SearchScope) {
  if (field === 'title') return 'Title';
  if (field === 'filename') return 'BAS filename';
  if (field === 'metadata') return 'Metadata/tags';
  if (field === 'body') return 'Body';
  return 'Content';
}

function matchContexts(fields: Record<SearchScope, string>, fieldsMatched: SearchScope[], terms: string[], fallbackTerms: string[]) {
  const matchTerms = terms.length ? terms : fallbackTerms;
  return fieldsMatched.map((field) => ({
    field,
    label: fieldLabel(field),
    snippet: makeSnippet(fields[field] || '', matchTerms, 220),
  })).filter((item) => item.snippet);
}

async function fetchSourceRows(supabase: ReturnType<typeof getSupabaseServerClient>, publisher?: string) {
  const rows: any[] = [];

  for (let from = 0; from < SOURCE_SEARCH_LIMIT; from += SOURCE_SEARCH_BATCH_SIZE) {
    const to = Math.min(from + SOURCE_SEARCH_BATCH_SIZE - 1, SOURCE_SEARCH_LIMIT - 1);
    let query = supabase
      .from('source_content')
      .select(SOURCE_SEARCH_COLUMNS)
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(from, to);

    if (publisher) query = query.eq('publisher', publisher);

    const { data, error } = await query;
    if (error) return { rows, error };

    const batch = data || [];
    rows.push(...batch);
    if (batch.length < SOURCE_SEARCH_BATCH_SIZE) break;
  }

  return { rows, error: null };
}

export async function POST(req: Request) {
  try {
    const { prompt, publisher, mode, mustInclude, mustExclude, searchScope = 'all' } = (await req.json()) as {
      prompt: string;
      publisher?: string;
      mode?: 'all' | 'any';
      mustInclude?: string;
      mustExclude?: string;
      searchScope?: SearchScope;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ ok: false, error: 'Missing prompt', stage: 'input' }, { status: 400 });
    }

    const parsed = parseSearchPrompt(prompt);
    const includeList = mustInclude?.trim()
      ? splitTerms(mustInclude)
      : parsed.mustInclude;
    const excludeList = mustExclude?.trim()
      ? splitTerms(mustExclude)
      : parsed.mustExclude;

    const structured = {
      mustInclude: includeList.length ? includeList : [prompt.trim()],
      mustExclude: excludeList,
      mode: mode || parsed.mode || 'all',
      publisher: publisher && publisher !== 'all' ? publisher : undefined,
      limit: SOURCE_SEARCH_LIMIT,
      searchScope: ['all', 'title', 'filename', 'body', 'metadata'].includes(searchScope) ? searchScope : 'all',
    };

    const supabase = getSupabaseServerClient();
    const { rows, error } = await fetchSourceRows(supabase, structured.publisher);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message, stage: 'query' }, { status: 500 });
    }

    const includeTerms = structured.mustInclude || [];
    const excludeTerms = structured.mustExclude || [];

    const matches = rows
      .map((row: any) => {
        const cleanBody = normalizeSourceText(getCanonicalBody(row));
        const filenameText = normalizeSourceText(searchableFilename(row));
        const metadataText = normalizeSourceText(searchableMeta(row));
        const cleanTitle = normalizeSourceText(decodeHtmlEntities(row.title || ''));
        const fields = {
          all: '',
          title: cleanTitle,
          filename: filenameText,
          body: cleanBody,
          metadata: metadataText,
        };
        const scoped = scopeFields(structured.searchScope, fields);
        const scored = scoreTextMatch({
          text: scoped.haystack,
          includeTerms,
          excludeTerms,
          mode: structured.mode,
        });

        const fieldsMatched = matchedFields(fields, scored.matchedTerms, structured.searchScope);
        const snippetSource = fieldsMatched.includes('body')
          ? cleanBody
          : fieldsMatched.includes('filename')
            ? filenameText
            : fieldsMatched.includes('metadata')
              ? metadataText
              : fields.title || cleanBody;

        const contexts = matchContexts(fields, fieldsMatched, scored.matchedTerms, includeTerms);

        return { row, cleanBody, cleanTitle, filenameText, fieldsMatched, contexts, snippetSource, ...scored };
      })
      .filter((row) => row.includeOk && row.excludeOk)
      .sort((a, b) => b.score - a.score)
      .map(({ row, cleanBody, cleanTitle, filenameText, fieldsMatched, contexts, snippetSource, matchedTerms, excludedTerms, score }) => ({
        id: row.id,
        externalId: row.external_id || null,
        basContentId: row.bas_content_id || null,
        basContentFilename: normalizeSourceText(row.bas_content_filename || filenameText || '') || null,
        title: cleanTitle,
        publisher: row.publisher || null,
        sourceSystem: row.source_system || null,
        type: row.type || 'article',
        publishedAt: row.published_at || null,
        url: row.metadata?.url || null,
        tags: Array.isArray(row.tags) ? row.tags : [],
        body: cleanBody,
        excerpt: makeSnippet(snippetSource, matchedTerms.length ? matchedTerms : includeTerms),
        snippet: makeSnippet(snippetSource, matchedTerms.length ? matchedTerms : includeTerms),
        matchedTerms,
        excludedTerms,
        matchedFields: fieldsMatched,
        matchContexts: contexts,
        score,
      }));

    return NextResponse.json({
      ok: true,
      parserUsed: 'deterministic',
      structured: {
        ...structured,
        searchedFields: structured.searchScope === 'all'
          ? ['title', 'filename', 'metadata', 'body']
          : [structured.searchScope],
      },
      total: matches.length,
      scanned: rows.length,
      capped: rows.length >= structured.limit,
      contentLoadMode: 'server-api',
      matches,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unexpected search failure', stage: 'unknown' }, { status: 500 });
  }
}
