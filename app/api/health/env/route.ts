import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      openAIModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
}
