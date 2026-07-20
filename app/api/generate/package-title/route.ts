import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { normalizeGenerationUsage, recordGenerationEvent } from '@/lib/generation-events';

const PackageTitleSchema = z.object({
  title: z.string().min(4).max(80),
});

function cleanTitle(value: string) {
  return value
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sourceTitle = String(body?.sourceTitle || '').trim();
    const sourceSummary = String(body?.sourceSummary || '').trim();
    const audience = String(body?.audience || 'Clients and prospects').trim();
    const tone = String(body?.tone || 'professional').trim();
    const organization = String(body?.organization || 'financial services organization').trim();
    const assetTypes = Array.isArray(body?.assetTypes)
      ? body.assetTypes.map((item: unknown) => String(item).trim()).filter(Boolean).slice(0, 8)
      : [];
    const customPrompt = String(body?.customPrompt || '').trim();
    const additionalContext = String(body?.additionalContext || '').trim();

    const env = getServerEnv();
    const modelName = process.env.PACKAGE_TITLE_MODEL || 'gpt-4o-mini';
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

    const result = await generateObject({
      model: openai(modelName),
      schema: PackageTitleSchema,
      temperature: 0.35,
      maxOutputTokens: 80,
      prompt: [
        'Create one short campaign package title for a financial-services content library.',
        'The title should sound like a saved campaign package, not an article headline.',
        'Reflect the campaign focus, target audience, and organization context when available.',
        'Keep it 4 to 9 words. No punctuation at the end. No quotation marks. No emojis.',
        '',
        `Organization context: ${organization}`,
        `Audience: ${audience}`,
        `Tone: ${tone}`,
        `Assets: ${assetTypes.join(', ') || 'Campaign assets'}`,
        `Source title: ${sourceTitle || 'Not provided'}`,
        `Source summary: ${sourceSummary.slice(0, 700) || 'Not provided'}`,
        `Campaign prompt: ${customPrompt.slice(0, 500) || 'Not provided'}`,
        `Additional context: ${additionalContext.slice(0, 500) || 'Not provided'}`,
      ].join('\n'),
    });

    const title = cleanTitle(result.object.title);
    if (!title) {
      return NextResponse.json({ error: 'No package title generated.' }, { status: 502 });
    }

    await recordGenerationEvent({
      tool: 'generate-content',
      contentType: 'package-title',
      category: 'content',
      assetCount: 1,
      model: modelName,
      meta: {
        mode: 'package-title',
        audience,
        tone,
        assetTypes,
        sourceTitle,
        ...normalizeGenerationUsage(result.usage),
      },
    });

    return NextResponse.json({ title, model: modelName });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to generate package title.' }, { status: 500 });
  }
}
