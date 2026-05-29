import { NextRequest, NextResponse } from 'next/server';
import { buildCeCourseExportPayload } from '@/lib/ce-course/export';
import { requireCeCourseApiAccess } from '@/lib/ce-course/public-api-auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireCeCourseApiAccess(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('ce_course_packages')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'CE course package not found.' }, { status: 404 });
  }

  return NextResponse.json({
    data: buildCeCourseExportPayload(data),
    meta: {
      formatVersion: 'ce-course-package.v1',
      auth: {
        required: Boolean(process.env.CE_COURSE_API_TOKEN?.trim()),
        acceptedHeaders: ['Authorization: Bearer <token>', 'x-api-key: <token>'],
      },
    },
  });
}
