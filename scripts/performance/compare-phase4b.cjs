const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../..");
const directory = path.resolve(
  root,
  process.env.PHASE4B_EVIDENCE_DIR ||
    "docs/improvements/phase-4/evidence/phase-4b",
);
assert.ok(
  directory.startsWith(root + path.sep),
  "Evidence must remain inside the workspace",
);
const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(directory, name + ".json"), "utf8"));
const quantile = (values, p) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b),
    n = sorted.length;
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
};
const percent = (before, after) => (after / before - 1) * 100;
const baseline = read("measure-baseline-b");
const optimized = read("measure-optimized-b");
assert.equal(baseline.project, optimized.project);
assert.equal(baseline.image, optimized.image);
assert.ok(!baseline.indexes.includes("Content_tenantId_updatedAt_idx"));
assert.ok(optimized.indexes.includes("Content_tenantId_updatedAt_idx"));
function summarize(runs) {
  const durations = runs.flatMap((r) => r.durationsMs);
  const requests = runs.reduce((n, r) => n + r.requests, 0);
  const cacheHits = runs.reduce(
    (n, r) =>
      n + (r.metricsDelta['atlas_cache_access_total{outcome="hit"}'] || 0),
    0,
  );
  const cacheMisses = runs.reduce(
    (n, r) =>
      n + (r.metricsDelta['atlas_cache_access_total{outcome="miss"}'] || 0),
    0,
  );
  return {
    requests,
    failed: runs.reduce((n, r) => n + r.failed, 0),
    cacheHits,
    cacheMisses,
    cacheHitPercent:
      cacheHits + cacheMisses
        ? (cacheHits / (cacheHits + cacheMisses)) * 100
        : null,
    concurrency: runs[0].concurrency,
    p50Ms: quantile(durations, 0.5),
    p95Ms: quantile(durations, 0.95),
    p99Ms: quantile(durations, 0.99),
    requestsPerSecond:
      (requests / runs.reduce((n, r) => n + r.elapsedMs, 0)) * 1000,
    apiCpuMsPerRequest:
      (runs.reduce((n, r) => n + r.apiCpuSeconds, 0) * 1000) / requests,
    peakSampledRssMiB:
      Math.max(...runs.map((r) => r.peakSampledRssBytes)) / 1024 ** 2,
    runP95Ms: runs.map((r) => r.p95Ms),
    runRequestsPerSecond: runs.map((r) => r.requestsPerSecond),
  };
}
const workloads = {};
for (const name of [...new Set(baseline.results.map((r) => r.name))]) {
  const b = summarize(baseline.results.filter((r) => r.name === name));
  const o = summarize(optimized.results.filter((r) => r.name === name));
  assert.equal(b.requests, o.requests);
  assert.equal(b.concurrency, o.concurrency);
  workloads[name] = {
    baseline: b,
    optimized: o,
    p95ChangePercent: percent(b.p95Ms, o.p95Ms),
    throughputChangePercent: percent(b.requestsPerSecond, o.requestsPerSecond),
  };
}
const bPlan = read("profile-baseline-warm"),
  oPlan = read("profile-optimized");
const plans = {};
for (const name of Object.keys(bPlan.plans)) {
  const summarizePlan = (p) => ({
    medianExecutionMs: median(p.executions.map((x) => x["Execution Time"])),
    medianSharedHitBlocks: median(
      p.executions.map((x) => x.Plan["Shared Hit Blocks"]),
    ),
    rootPlan: p.executions[0].Plan["Node Type"],
  });
  plans[name] = {
    baseline: summarizePlan(bPlan.plans[name]),
    optimized: summarizePlan(oPlan.plans[name]),
  };
}
const all = ["baseline-a", "optimized-a", "optimized-b", "baseline-b"].map(
  (name) => read("measure-" + name),
);
const mixedOperations = {};
for (const name of Object.keys(
  baseline.results.find((r) => r.name === "mixed").byOperation,
)) {
  mixedOperations[name] = Object.fromEntries(
    [
      ["baseline", baseline],
      ["optimized", optimized],
    ].map(([label, report]) => [
      label,
      report.results
        .filter((r) => r.name === "mixed")
        .map((r) => r.byOperation[name]),
    ]),
  );
}
const exportResults = Object.fromEntries(
  ["baseline", "optimized"].map((name) => [
    name,
    read("export-" + name).results,
  ]),
);
const report = {
  measuredAt: new Date().toISOString(),
  project: baseline.project,
  image: baseline.image,
  design:
    "A1 B1 B2 A2; two rounds/block. A=no candidate indexes, B=both candidate indexes. Same API process, fixture and pool. PostgreSQL buffers warm; cold means Redis response-cache miss only.",
  primaryComparison:
    "Steady-state baseline-b (A2) versus optimized-b (B2). Early baseline-a retained but excluded from improvement claims because unaffected warm-cache controls also improved after initial warmup.",
  aggregation:
    "Percentiles pooled across two equal-sized rounds. Throughput = total requests / total elapsed measured load time. HTTP timing includes body decode and assertions. No coordinated-omission correction for closed-loop load.",
  totalLoadRequests: all
    .flatMap((r) => r.results)
    .reduce((n, r) => n + r.requests, 0),
  totalLoadFailures: all
    .flatMap((r) => r.results)
    .reduce((n, r) => n + r.failed, 0),
  workloads,
  mixedOperations,
  plans,
  exports: exportResults,
  limitations: [
    "Local Docker Desktop and synthetic dataset; no production traffic trace or production capacity/SLA claim.",
    "Four large tenants have equal size, 25% published, 2 KiB compressible HTML. Small historical-shape control also uses this body, so it is not byte-equivalent to the old 25-record benchmark.",
    "Fixed concurrency, short closed-loop blocks, one API/worker, DB on tmpfs, no separate pool-wait attribution. API CPU is process CPU; RSS is sampled and shared across arms, not allocation or DB/container peak memory.",
    "Mixed is 20% PATCH plus 20% each dashboard/media-list/audit-list/content-list. Repeated PATCH of existing rows changes updatedAt and audit rows, not fixture cardinality or status distribution. No heavy bulk import or long-term index-bloat test.",
    "Media workload reads one sanitized 1280x720 solid-colour PNG; metadata list has 2,000 rows/tenant. Not a large-file upload or photo-memory stress benchmark.",
    "Export uses three sequential 25,000-row jobs per arm, fixed date, 250ms polling. Results prove archive correctness; no export optimization or latency improvement is claimed.",
    "Warm-cache/control changes and memory drift must not be attributed to the new indexes. No frontend interaction or WAN measurement.",
  ],
};
assert.equal(report.totalLoadFailures, 0);
fs.writeFileSync(
  path.join(directory, "comparison.json"),
  JSON.stringify(report, null, 2) + "\n",
);
const display = Object.fromEntries(
  Object.entries(workloads).map(([name, r]) => [
    name,
    {
      p95Before: +r.baseline.p95Ms.toFixed(2),
      p95After: +r.optimized.p95Ms.toFixed(2),
      rpsBefore: +r.baseline.requestsPerSecond.toFixed(1),
      rpsAfter: +r.optimized.requestsPerSecond.toFixed(1),
      p95ChangePercent: +r.p95ChangePercent.toFixed(1),
      throughputChangePercent: +r.throughputChangePercent.toFixed(1),
    },
  ]),
);
console.log(JSON.stringify(display, null, 2));
