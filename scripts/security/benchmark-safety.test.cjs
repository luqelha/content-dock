const { test } = require("node:test");
const assert = require("node:assert/strict");
test("benchmark rejects remote targets and mismatched test databases before sending mutations", async () => {
  const { verifyBenchmarkTarget } = await import("../benchmark-safety.mjs");
  const db = "postgresql://test:test@127.0.0.1/atlas_test";
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return {
      ok: true,
      json: async () => ({ environment: "test", testDatabase: "atlas_test" }),
    };
  };
  await assert.rejects(
    verifyBenchmarkTarget("https://production.example/api", db, fetcher),
  );
  assert.equal(calls, 0);
  await verifyBenchmarkTarget("http://127.0.0.1:4400/api", db, fetcher);
  await assert.rejects(
    verifyBenchmarkTarget("http://127.0.0.1:4400/api", db, async () => ({
      ok: true,
      json: async () => ({ environment: "test", testDatabase: "another_test" }),
    })),
  );
});
