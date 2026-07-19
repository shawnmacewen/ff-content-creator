import sharp from 'sharp';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const CONTENT_UPLOAD_THUMBNAIL_BUCKET = process.env.SUPABASE_CONTENT_THUMBNAIL_BUCKET || 'source-content-thumbnails';
export const CONTENT_UPLOAD_THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024;
export const CONTENT_UPLOAD_THUMBNAIL_WIDTH = 1200;
export const CONTENT_UPLOAD_THUMBNAIL_HEIGHT = 675;

const ALLOWED_THUMBNAIL_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export function assertSupportedThumbnailFile(args: { mimeType: string; size: number }) {
  if (!ALLOWED_THUMBNAIL_TYPES.has(args.mimeType.toLowerCase())) {
    throw new Error('Upload a PNG, JPG, JPEG, or WebP thumbnail.');
  }

  if (args.size > CONTENT_UPLOAD_THUMBNAIL_MAX_BYTES) {
    throw new Error('Thumbnail uploads must be 5 MB or smaller.');
  }
}

async function ensureThumbnailBucket() {
  const supabase = getSupabaseServerClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const existingBucket = buckets?.find((bucket) => bucket.name === CONTENT_UPLOAD_THUMBNAIL_BUCKET);

  if (!existingBucket) {
    const { error } = await supabase.storage.createBucket(CONTENT_UPLOAD_THUMBNAIL_BUCKET, {
      public: true,
      fileSizeLimit: CONTENT_UPLOAD_THUMBNAIL_MAX_BYTES,
      allowedMimeTypes: ['image/webp'],
    });

    if (error && !/already exists/i.test(error.message)) throw error;
  } else if (!existingBucket.public) {
    const { error } = await supabase.storage.updateBucket(CONTENT_UPLOAD_THUMBNAIL_BUCKET, {
      public: true,
      fileSizeLimit: CONTENT_UPLOAD_THUMBNAIL_MAX_BYTES,
      allowedMimeTypes: ['image/webp'],
    });

    if (error) throw error;
  }
}

export async function uploadContentThumbnail(args: {
  buffer: Buffer;
  source: 'upload' | 'ai';
  filenameBase?: string;
}) {
  await ensureThumbnailBucket();

  const optimized = await sharp(args.buffer)
    .rotate()
    .resize(CONTENT_UPLOAD_THUMBNAIL_WIDTH, CONTENT_UPLOAD_THUMBNAIL_HEIGHT, {
      fit: 'cover',
      position: 'center',
    })
    .webp({ quality: 82 })
    .toBuffer();

  const supabase = getSupabaseServerClient();
  const safeBase = (args.filenameBase || 'content-thumbnail')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'content-thumbnail';
  const path = `custom-content/${args.source}/${new Date().toISOString().slice(0, 10)}/${safeBase}-${crypto.randomUUID()}.webp`;

  const { error } = await supabase.storage
    .from(CONTENT_UPLOAD_THUMBNAIL_BUCKET)
    .upload(path, optimized, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(CONTENT_UPLOAD_THUMBNAIL_BUCKET).getPublicUrl(path);

  return {
    url: data.publicUrl,
    path,
    width: CONTENT_UPLOAD_THUMBNAIL_WIDTH,
    height: CONTENT_UPLOAD_THUMBNAIL_HEIGHT,
    mimeType: 'image/webp',
    sizeBytes: optimized.length,
  };
}
