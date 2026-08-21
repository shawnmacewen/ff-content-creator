import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import type { BrandProfileSourceFile, BrandProfileStrictness } from '@/lib/brand-profile';

const BrandProfileSchema = z.object({
  name: z.string().min(1).max(80),
  strictness: z.enum(['light', 'balanced', 'strict']),
  sourceSummary: z.string().max(600),
  primaryColor: z.string().max(40),
  secondaryColor: z.string().max(40),
  accentColor: z.string().max(40),
  neutralColor: z.string().max(40),
  typography: z.string().max(260),
  imageryStyle: z.string().max(360),
  layoutStyle: z.string().max(360),
  logoNotes: z.string().max(280),
  voiceNotes: z.string().max(360),
  complianceNotes: z.string().max(360),
  forbiddenTreatments: z.array(z.string().max(120)).max(8),
  promptSummary: z.string().min(20).max(900),
});

const SUPPORTED_FILE_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

function cleanString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function fileSummary(file: File): BrandProfileSourceFile {
  return {
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
  };
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const requestedName = cleanString(form.get('name'));
    const notes = cleanString(form.get('notes'));
    const requestedStrictness = cleanString(form.get('strictness')) as BrandProfileStrictness;
    const files = form.getAll('files').filter((item): item is File => item instanceof File && item.size > 0).slice(0, 6);
    const sourceFiles = files.map(fileSummary);

    if (!notes && !files.length && !requestedName) {
      return Response.json({ error: 'Add a partner name, notes, or uploaded guidelines before generating a Brand Profile.' }, { status: 400 });
    }

    const oversized = files.find((file) => file.size > 8 * 1024 * 1024);
    if (oversized) {
      return Response.json({ error: `${oversized.name} is larger than the 8 MB MVP upload limit.` }, { status: 400 });
    }

    const unsupported = files.find((file) => file.type && !SUPPORTED_FILE_TYPES.has(file.type));
    if (unsupported) {
      return Response.json({ error: `${unsupported.name} uses an unsupported file type for the MVP (${unsupported.type}).` }, { status: 400 });
    }

    const env = getServerEnv();
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const content: any[] = [
      {
        type: 'text',
        text: [
          'Create a compact Brand Profile for a financial services content generation tool.',
          'The profile will guide copy, Instagram carousel visuals, image prompts, and infographic design.',
          'Infer useful direction from uploaded guidelines, images, PDFs, or pasted notes.',
          'Do not invent exact brand rules that are not supported; use cautious phrasing when inferred.',
          '',
          `Requested profile name: ${requestedName || 'Not provided'}`,
          `Requested strictness: ${requestedStrictness || 'balanced'}`,
          '',
          'Pasted notes:',
          notes || 'None',
          '',
          'Uploaded files:',
          sourceFiles.length ? sourceFiles.map((file) => `- ${file.name} (${file.type}, ${file.size} bytes)`).join('\n') : 'None',
        ].join('\n'),
      },
    ];

    for (const file of files) {
      const data = new Uint8Array(await file.arrayBuffer());
      content.push({
        type: file.type.startsWith('image/') ? 'image' : 'file',
        ...(file.type.startsWith('image/')
          ? { image: data, mediaType: file.type }
          : { data, filename: file.name, mediaType: file.type || 'application/octet-stream' }),
      });
    }

    const generated = await generateObject({
      model: openai(env.OPENAI_MODEL),
      schema: BrandProfileSchema,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    });

    return Response.json({
      profile: {
        ...generated.object,
        name: generated.object.name || requestedName || 'Untitled Brand Profile',
        strictness: generated.object.strictness || requestedStrictness || 'balanced',
        sourceFiles,
      },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Brand Profile generation failed' }, { status: 500 });
  }
}
