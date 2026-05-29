import { NextRequest, NextResponse } from 'next/server';
import { buildCeCourseApiSummary } from '@/lib/ce-course/export';
import { requireCeCourseApiAccess } from '@/lib/ce-course/public-api-auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const unauthorized = requireCeCourseApiAccess(request);
  if (unauthorized) return unauthorized;

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || '';
    const q = searchParams.get('q') || '';
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)));
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('ce_course_packages')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') query = query.eq('status', status);
    if (q) query = query.or(`title.ilike.%${q}%,objective.ilike.%${q}%,theme.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      data: (data || []).map(buildCeCourseApiSummary),
      meta: {
        formatVersion: 'ce-course-package.v1',
        count: data?.length || 0,
        limit,
        filters: {
          status: status || null,
          q: q || null,
        },
        auth: {
          required: Boolean(process.env.CE_COURSE_API_TOKEN?.trim()),
          acceptedHeaders: ['Authorization: Bearer <token>', 'x-api-key: <token>'],
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load CE course API packages.' }, { status: 500 });
  }
}
