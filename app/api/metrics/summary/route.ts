import { NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/dashboard/metrics';

export async function GET() {
  const metrics = await getDashboardMetrics();
  return NextResponse.json({ ok: true, ...metrics });
}
