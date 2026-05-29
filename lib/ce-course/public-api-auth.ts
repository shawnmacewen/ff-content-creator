import { NextRequest, NextResponse } from 'next/server';

export function requireCeCourseApiAccess(request: NextRequest) {
  const expectedToken = process.env.CE_COURSE_API_TOKEN?.trim();
  if (!expectedToken) return null;

  const authorization = request.headers.get('authorization') || '';
  const bearerToken = authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : '';
  const apiKey = request.headers.get('x-api-key')?.trim() || '';

  if (bearerToken === expectedToken || apiKey === expectedToken) return null;

  return NextResponse.json(
    {
      error: 'Unauthorized CE Course API request.',
      detail: 'Provide Authorization: Bearer <token> or x-api-key when CE_COURSE_API_TOKEN is configured.',
    },
    { status: 401 }
  );
}
