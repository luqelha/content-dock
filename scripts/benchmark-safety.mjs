export async function verifyBenchmarkTarget(api, databaseUrl, fetcher = fetch) {
  const target = new URL(api);
  const database = new URL(databaseUrl);
  const loopback = (host) => ["127.0.0.1", "localhost", "[::1]"].includes(host);
  if (
    target.protocol !== "http:" ||
    !loopback(target.hostname) ||
    target.port !== "4400" ||
    target.pathname !== "/api" ||
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    !loopback(database.hostname) ||
    !/(?:^|_)(?:test|review)(?:_|$)/i.test(database.pathname.slice(1))
  ) {
    throw new Error(
      "Benchmark requires loopback test API port 4400 and a dedicated test database.",
    );
  }
  const response = await fetcher(`${api}/health`, {
    signal: AbortSignal.timeout(5000),
  });
  const health = await response.json();
  if (
    !response.ok ||
    health.environment !== "test" ||
    health.testDatabase !== decodeURIComponent(database.pathname.slice(1))
  ) {
    throw new Error("Target API does not confirm the expected test database.");
  }
}
