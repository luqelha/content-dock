/** Keep private files on the authenticated, same-origin download route. */
export function privateFileUrl(url: string): string {
  const match = url.match(/(?:^|\/)uploads\/([a-zA-Z0-9-]+\.[a-zA-Z0-9]+)$/);
  return match ? `/api/files/${match[1]}` : url;
}

/** Upgrade legacy image sources without changing unrelated content or links. */
export function privateContentImages(html: string): string {
  return html.replace(
    /(<img\b[^>]*\bsrc\s*=\s*)(["'])([^"']+)\2/gi,
    (_match, prefix, quote, url) =>
      `${prefix}${quote}${privateFileUrl(url)}${quote}`,
  );
}
