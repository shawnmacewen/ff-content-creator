import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get('tag') || '';
  const normalizedTag = normalizeTag(tag);

  if (!normalizedTag) {
    return NextResponse.json({ error: 'Missing tag' }, { status: 400 });
  }

  return NextResponse.json({
    disabled: true,
    tag: normalizedTag,
    sourceItems: [],
  });
}
