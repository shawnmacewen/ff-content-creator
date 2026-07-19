import { NextRequest, NextResponse } from 'next/server';
import {
  assertSupportedThumbnailFile,
  uploadContentThumbnail,
} from '@/lib/content-upload/thumbnail-storage';

function cleanFilenameBase(value: string) {
  return value.replace(/\.[a-z0-9]+$/i, '').trim() || 'uploaded-thumbnail';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
      return NextResponse.json({ error: 'Choose a thumbnail file to upload.' }, { status: 400 });
    }

    const uploadedFile = file as File;
    assertSupportedThumbnailFile({
      mimeType: uploadedFile.type,
      size: uploadedFile.size,
    });

    const buffer = Buffer.from(await uploadedFile.arrayBuffer());
    const thumbnail = await uploadContentThumbnail({
      buffer,
      source: 'upload',
      filenameBase: cleanFilenameBase(uploadedFile.name),
    });

    return NextResponse.json({
      thumbnail: {
        ...thumbnail,
        source: 'upload',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to upload thumbnail.' }, { status: 500 });
  }
}
