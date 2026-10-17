/** The filename extension and decoder must agree on the accepted MIME types. */
const formats = {
  'image/jpeg': { extension: 'jpg', decoder: 'jpeg' },
  'image/png': { extension: 'png', decoder: 'png' },
  'image/webp': { extension: 'webp', decoder: 'webp' },
  'image/gif': { extension: 'gif', decoder: 'gif' },
  'application/pdf': { extension: 'pdf', decoder: undefined },
} as const;

export function uploadFormat(mime: string, avatar = false) {
  if (!Object.prototype.hasOwnProperty.call(formats, mime)) return undefined;
  const format = formats[mime as keyof typeof formats];
  if (avatar && (format.extension === 'gif' || format.extension === 'pdf')) return undefined;
  return format;
}
