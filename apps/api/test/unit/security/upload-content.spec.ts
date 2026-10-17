import { createRequire } from 'node:module';
const sharp: typeof import('sharp').default = createRequire(__filename)('sharp');
import { validateUpload } from '../../../src/modules/storage/validate-upload';

describe('Upload content validation', () => {
  const file = (buffer: Buffer, mimetype = 'image/png') =>
    ({ buffer, mimetype }) as Express.Multer.File;
  it('rejects arbitrary content labelled as a PNG', async () => {
    await expect(validateUpload(file(Buffer.from('<script>alert(1)</script>')))).rejects.toThrow();
  });
  it('rejects a valid image with a different claimed type', async () => {
    const jpeg = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } })
      .jpeg()
      .toBuffer();
    await expect(validateUpload(file(jpeg))).rejects.toThrow();
  });
  it('decodes and re-encodes a valid PNG for media and avatars', async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } })
      .png()
      .toBuffer();
    for (const avatar of [false, true]) {
      const output = await validateUpload(file(png), avatar);
      expect((await sharp(output).metadata()).format).toBe('png');
    }
  });
  it('rejects truncated image data', async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } })
      .png()
      .toBuffer();
    await expect(validateUpload(file(png.subarray(0, 40)))).rejects.toThrow();
  });
  it('rejects fake PDFs and PDFs used as avatars', async () => {
    await expect(
      validateUpload(file(Buffer.from('not a PDF'), 'application/pdf')),
    ).rejects.toThrow();
    await expect(
      validateUpload(file(Buffer.from('%PDF-1.7\n%%EOF'), 'application/pdf'), true),
    ).rejects.toThrow();
  });
});
