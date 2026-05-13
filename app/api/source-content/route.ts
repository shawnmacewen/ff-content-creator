import { NextRequest, NextResponse } from 'next/server';
import {
  searchSourceContent,
  getAllTags,
  getAllTypes,
  getAllAuthors,
} from '@/lib/api/source-content-mock';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || undefined;
  const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined;
  const author = searchParams.get('author') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 200));

  const allResults = searchSourceContent(query, { type, tags, author });
  
  // Pagination
  const startIndex = (page - 1) * pageSize;
  const paginatedResults = allResults.slice(startIndex, startIndex + pageSize);

  return NextResponse.json({
    data: paginatedResults,
    total: allResults.length,
    page,
    pageSize,
    totalPages: Math.ceil(allResults.length / pageSize),
    filters: {
      availableTags: getAllTags(),
      availableTypes: getAllTypes(),
      availableAuthors: getAllAuthors(),
    },
  });
}
