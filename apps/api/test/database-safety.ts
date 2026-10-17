export function assertTestDatabase() {
  const url = process.env.DATABASE_URL;
  const name = url ? new URL(url).pathname.slice(1) : '';
  if (!/(?:^|_)(?:test|review)(?:_|$)/i.test(name)) {
    throw new Error('Tests require a dedicated database named with _test or _review.');
  }
}
