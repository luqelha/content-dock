import { uploadFormat } from './upload-formats';
import { BadRequestException } from '@nestjs/common';
import { createRequire } from 'node:module';
const sharp: typeof import('sharp').default = createRequire(__filename)('sharp');

/** Decode and re-encode supported images; MIME labels alone are never authoritative. */
export async function validateUpload(file: Express.Multer.File, avatar = false): Promise<Buffer> {
  if (!file?.buffer?.length) throw new BadRequestException('Choose a file to upload.');
  const maxBytes = (avatar ? 2 : 5) * 1024 * 1024;
  if (file.buffer.length > maxBytes)
    throw new BadRequestException('File exceeds the upload limit.');
  if (!avatar && file.mimetype === 'application/pdf') {
    // Format screening is not malware scanning; PDFs are downloaded with sandbox/nosniff headers.
    if (
      !/^%PDF-1\.[0-9]/.test(file.buffer.subarray(0, 8).toString('ascii')) ||
      !file.buffer.subarray(-1024).toString('latin1').includes('%%EOF')
    ) {
      throw new BadRequestException('The file is not a supported PDF document.');
    }
    return file.buffer;
  }
  const format = uploadFormat(file.mimetype, avatar)?.decoder;
  if (!format) throw new BadRequestException('Unsupported image type.');
  try {
    const image = sharp(file.buffer, {
      failOn: 'warning',
      limitInputPixels: 16_000_000,
      animated: true,
    }).timeout({ seconds: 5 });
    const metadata = await image.metadata();
    if (metadata.format !== format || (metadata.pages || 1) > 100)
      throw new Error('Image format mismatch');
    const result = await image.toFormat(format).toBuffer();
    if (result.length > maxBytes) throw new Error('Decoded image exceeds the upload limit');
    return result;
  } catch {
    throw new BadRequestException(
      'The image is invalid, too large, or does not match its declared type.',
    );
  }
}
