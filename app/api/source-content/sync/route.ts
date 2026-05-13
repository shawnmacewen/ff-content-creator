import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    ok: true,
    status: 'stub',
    message: 'Source content sync endpoint is scaffolded. Provider integration not yet wired.',
  });
}
