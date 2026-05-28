import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    disabled: true,
    tags: [],
    summary: {
      uniqueTags: 0,
      totalTagUses: 0,
      taggedContentCount: 0,
      singleUseCount: 0,
      variantCount: 0,
    },
  });
}
