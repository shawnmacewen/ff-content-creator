import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import sharp from 'sharp';
import { inflateSync } from 'zlib';
import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import type { BrandProfileLogoCandidate, BrandProfileSourceFile, BrandProfileStrictness } from '@/lib/brand-profile';

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

const MAX_LOGO_CANDIDATES = 8;
const MAX_LOGO_CANDIDATE_BYTES = 1024 * 1024;

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

function makeCandidateId(sourceFile: string, index: number) {
  return `${sourceFile.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'logo'}-${index}`;
}

async function logoCandidateFromImage(args: {
  buffer: Buffer;
  sourceFile: string;
  name: string;
  index: number;
  confidence: BrandProfileLogoCandidate['confidence'];
  reason: string;
}): Promise<BrandProfileLogoCandidate | null> {
  try {
    const metadata = await sharp(args.buffer).metadata();
    if (!metadata.width || !metadata.height) return null;
    if (metadata.width < 24 || metadata.height < 16) return null;

    const optimized = await sharp(args.buffer)
      .resize({ width: 640, height: 320, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer();

    if (optimized.length > MAX_LOGO_CANDIDATE_BYTES) return null;

    return {
      id: makeCandidateId(args.sourceFile, args.index),
      name: args.name,
      type: 'image/webp',
      size: optimized.length,
      dataUrl: `data:image/webp;base64,${optimized.toString('base64')}`,
      sourceFile: args.sourceFile,
      confidence: args.confidence,
      reason: args.reason,
    };
  } catch {
    return null;
  }
}

async function logoCandidateFromRawImage(args: {
  raw: Buffer;
  alpha?: Buffer;
  width: number;
  height: number;
  channels: 3 | 4;
  sourceFile: string;
  name: string;
  index: number;
  confidence: BrandProfileLogoCandidate['confidence'];
  reason: string;
}): Promise<BrandProfileLogoCandidate | null> {
  try {
    if (args.width < 24 || args.height < 16) return null;

    let raw = args.raw;
    let channels = args.channels;
    if (args.alpha && args.channels === 3 && args.alpha.length >= args.width * args.height) {
      const rgba = Buffer.alloc(args.width * args.height * 4);
      for (let pixel = 0; pixel < args.width * args.height; pixel += 1) {
        rgba[pixel * 4] = args.raw[pixel * 3];
        rgba[pixel * 4 + 1] = args.raw[pixel * 3 + 1];
        rgba[pixel * 4 + 2] = args.raw[pixel * 3 + 2];
        rgba[pixel * 4 + 3] = args.alpha[pixel];
      }
      raw = rgba;
      channels = 4;
    }

    const optimized = await sharp(raw, { raw: { width: args.width, height: args.height, channels } })
      .resize({ width: 640, height: 320, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer();

    if (optimized.length > MAX_LOGO_CANDIDATE_BYTES) return null;

    return {
      id: makeCandidateId(args.sourceFile, args.index),
      name: args.name,
      type: 'image/webp',
      size: optimized.length,
      dataUrl: `data:image/webp;base64,${optimized.toString('base64')}`,
      sourceFile: args.sourceFile,
      confidence: args.confidence,
      reason: args.reason,
    };
  } catch {
    return null;
  }
}

type PdfImageObject = {
  id: number;
  dictionary: string;
  stream: Buffer;
  width: number;
  height: number;
  bitsPerComponent: number;
  channels: 1 | 3 | 4 | null;
  softMaskId: number | null;
};

function readPdfInt(dictionary: string, key: string) {
  const match = new RegExp(`/${key}\\s+(\\d+)`).exec(dictionary);
  return match ? Number(match[1]) : 0;
}

function readPdfSoftMaskId(dictionary: string) {
  const match = /\/SMask\s+(\d+)\s+\d+\s+R/.exec(dictionary);
  return match ? Number(match[1]) : null;
}

function readPdfChannels(dictionary: string): 1 | 3 | 4 | null {
  if (/\/ColorSpace\s+\/DeviceGray/.test(dictionary)) return 1;
  if (/\/ColorSpace\s+\/DeviceRGB/.test(dictionary)) return 3;
  if (/\/ColorSpace\s+\[\/ICCBased\s+\d+\s+\d+\s+R\]/.test(dictionary)) return 3;
  if (/\/ColorSpace\s+\/DeviceCMYK/.test(dictionary)) return 4;
  return null;
}

function parsePdfImageObjects(buffer: Buffer) {
  const text = buffer.toString('latin1');
  const objects = new Map<number, PdfImageObject>();
  const objectPattern = /(\d+)\s+\d+\s+obj/g;
  let match: RegExpExecArray | null;

  while ((match = objectPattern.exec(text))) {
    const objectId = Number(match[1]);
    const objectStart = match.index;
    const objectEnd = text.indexOf('endobj', objectStart);
    if (objectEnd === -1) break;

    const streamIndex = text.indexOf('stream', objectStart);
    if (streamIndex === -1 || streamIndex > objectEnd) continue;

    const endStreamIndex = text.indexOf('endstream', streamIndex);
    if (endStreamIndex === -1 || endStreamIndex > objectEnd) continue;

    const dictionary = text.slice(objectStart, streamIndex);
    if (!/\/Subtype\s*\/Image/.test(dictionary)) continue;

    let streamStart = streamIndex + 'stream'.length;
    if (buffer[streamStart] === 0x0d && buffer[streamStart + 1] === 0x0a) streamStart += 2;
    else if (buffer[streamStart] === 0x0a) streamStart += 1;

    let streamEnd = endStreamIndex;
    while (streamEnd > streamStart && (buffer[streamEnd - 1] === 0x0a || buffer[streamEnd - 1] === 0x0d || buffer[streamEnd - 1] === 0x20)) {
      streamEnd -= 1;
    }

    objects.set(objectId, {
      id: objectId,
      dictionary,
      stream: buffer.subarray(streamStart, streamEnd),
      width: readPdfInt(dictionary, 'Width'),
      height: readPdfInt(dictionary, 'Height'),
      bitsPerComponent: readPdfInt(dictionary, 'BitsPerComponent'),
      channels: readPdfChannels(dictionary),
      softMaskId: readPdfSoftMaskId(dictionary),
    });
  }

  return objects;
}

async function extractLogoCandidatesFromPdf(buffer: Buffer, sourceFile: string): Promise<BrandProfileLogoCandidate[]> {
  const candidates: BrandProfileLogoCandidate[] = [];
  let candidateIndex = 1;
  const imageObjects = parsePdfImageObjects(buffer);

  for (const imageObject of imageObjects.values()) {
    if (candidates.length >= MAX_LOGO_CANDIDATES) break;
    if (imageObject.channels === 1) continue;

    if (/\/Filter\s*(?:\[[^\]]*)?\/DCTDecode/.test(imageObject.dictionary)) {
      if (imageObject.stream[0] === 0xff && imageObject.stream[1] === 0xd8) {
        const candidate = await logoCandidateFromImage({
          buffer: imageObject.stream,
          sourceFile,
          name: `${sourceFile} suggested logo ${candidateIndex}`,
          index: candidateIndex,
          confidence: 'medium',
          reason: 'Extracted from an embedded image in the uploaded PDF.',
        });
        if (candidate) {
          candidates.push(candidate);
          candidateIndex += 1;
        }
      }
      continue;
    }

    if (/\/Filter\s*(?:\[[^\]]*)?\/FlateDecode/.test(imageObject.dictionary) && imageObject.bitsPerComponent === 8 && imageObject.channels) {
      try {
        const raw = inflateSync(imageObject.stream);
        const expectedLength = imageObject.width * imageObject.height * imageObject.channels;
        if (raw.length < expectedLength) continue;

        const maskObject = imageObject.softMaskId ? imageObjects.get(imageObject.softMaskId) : null;
        const alpha = maskObject?.channels === 1 && maskObject.width === imageObject.width && maskObject.height === imageObject.height
          ? inflateSync(maskObject.stream)
          : undefined;

        const candidate = await logoCandidateFromRawImage({
          raw: raw.subarray(0, expectedLength),
          alpha,
          width: imageObject.width,
          height: imageObject.height,
          channels: imageObject.channels === 4 ? 4 : 3,
          sourceFile,
          name: `${sourceFile} suggested logo ${candidateIndex}`,
          index: candidateIndex,
          confidence: 'medium',
          reason: 'Extracted from a compressed image in the uploaded PDF.',
        });
        if (candidate) {
          candidates.push(candidate);
          candidateIndex += 1;
        }
      } catch {
        continue;
      }
    }
  }

  return candidates;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const requestedName = cleanString(form.get('name'));
    const notes = cleanString(form.get('notes'));
    const requestedStrictness = cleanString(form.get('strictness')) as BrandProfileStrictness;
    const files = form.getAll('files').filter((item): item is File => item instanceof File && item.size > 0).slice(0, 6);
    const sourceFiles = files.map(fileSummary);
    const filePayloads: Array<{ file: File; data: Buffer }> = [];
    const logoCandidates: BrandProfileLogoCandidate[] = [];

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

    for (const file of files) {
      const data = Buffer.from(await file.arrayBuffer());
      filePayloads.push({ file, data });

      if (file.type.startsWith('image/') && logoCandidates.length < MAX_LOGO_CANDIDATES) {
        const candidate = await logoCandidateFromImage({
          buffer: data,
          sourceFile: file.name,
          name: file.name,
          index: logoCandidates.length + 1,
          confidence: 'high',
          reason: 'Uploaded image file from the Brand Profile scan.',
        });
        if (candidate) logoCandidates.push(candidate);
      }

      if (file.type === 'application/pdf' && logoCandidates.length < MAX_LOGO_CANDIDATES) {
        const extracted = await extractLogoCandidatesFromPdf(data, file.name);
        logoCandidates.push(...extracted.slice(0, MAX_LOGO_CANDIDATES - logoCandidates.length));
      }
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

    for (const { file, data } of filePayloads) {
      content.push({
        type: file.type.startsWith('image/') ? 'image' : 'file',
        ...(file.type.startsWith('image/')
          ? { image: new Uint8Array(data), mediaType: file.type }
          : { data: new Uint8Array(data), filename: file.name, mediaType: file.type || 'application/octet-stream' }),
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
      logoCandidates,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Brand Profile generation failed' }, { status: 500 });
  }
}
