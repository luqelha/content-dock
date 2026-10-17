import { writeFile, mkdir } from "node:fs/promises";
import { platform, cpus } from "node:os";
import { verifyBenchmarkTarget } from "./benchmark-safety.mjs";

if (
  !process.env.DATABASE_URL ||
  !/(?:^|_)(?:test|review)(?:_|$)/i.test(
    new URL(process.env.DATABASE_URL).pathname.slice(1),
  )
) {
  throw new Error("Benchmark requires a dedicated test database.");
}
const api = process.env.E2E_API_URL || "http://127.0.0.1:4400/api";
await verifyBenchmarkTarget(api, process.env.DATABASE_URL);
const email = `benchmark-${Date.now()}@example.test`;
const credentials = { email, password: "Benchmark-Test-Only-428!" };
async function call(route, method = "GET", data, headers = {}) {
  const response = await fetch(`${api}${route}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) throw new Error(`${method} ${route}: ${response.status}`);
  return response.json();
}
await call("/auth/register", "POST", credentials);
const login = await call("/auth/login", "POST", credentials);
const authorization = { Authorization: `Bearer ${login.access_token}` };
const tenant = await call(
  "/tenants",
  "POST",
  { name: "Benchmark workspace" },
  authorization,
);
const headers = { ...authorization, "x-tenant-id": tenant.id };
for (let i = 0; i < 25; i++)
  await call(
    "/contents",
    "POST",
    { title: `Benchmark record ${i}`, body: "<p>Benchmark body</p>" },
    headers,
  );
await call("/contents?page=1&take=20", "GET", undefined, headers);
const total = 1000;
const concurrency = 25;
let next = 0;
let failed = 0;
const durations = [];
const began = performance.now();
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (next++ < total) {
      const start = performance.now();
      try {
        await call("/contents?page=1&take=20", "GET", undefined, headers);
      } catch {
        failed++;
      }
      durations.push(performance.now() - start);
    }
  }),
);
const elapsedMs = performance.now() - began;
durations.sort((a, b) => a - b);
const percentile = (p) =>
  Math.round(durations[Math.ceil(durations.length * p) - 1] * 100) / 100;
const result = {
  measuredAt: new Date().toISOString(),
  node: process.version,
  platform: platform(),
  cpu: cpus()[0]?.model,
  workload:
    "Authenticated GET /contents?page=1&take=20; one tenant; 25 records; warm Redis cache",
  requests: total,
  concurrency,
  failed,
  elapsedMs: Math.round(elapsedMs),
  requestsPerSecond: Math.round((total / elapsedMs) * 1000),
  p50Ms: percentile(0.5),
  p95Ms: percentile(0.95),
  p99Ms: percentile(0.99),
  limitations:
    "Local smoke load; not a sustained, cold-cache, multi-tenant or production SLA test.",
};
const directory = new URL("../artifacts/benchmark/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(
  new URL("benchmark.json", directory),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
if (failed) process.exitCode = 1;
