import { NextRequest, NextResponse } from 'next/server';
import { getSourceContentById } from '@/lib/api/source-content-mock';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 100));

  const content = getSourceContentById(id);

  if (!content) {
    return NextResponse.json(
      { error: 'Source content not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(content);
}
