const { test } = require("node:test");
const assert = require("node:assert/strict");
const { reviewLifecycle } = require("./lifecycle-policy.cjs");
const policy = require("../../ops/maintenance/dependency-lifecycle.json");
test("reviewed runtimes pass while unsupported majors and early Node 22 fail", () => {
  const now = new Date("2026-10-16T00:00:00Z");
  assert.deepEqual(reviewLifecycle(policy, "24.0.0", now), []);
  assert.deepEqual(reviewLifecycle(policy, "22.12.0", now), []);
  for (const version of ["20.19.0", "22.11.0", "25.0.0", "26.0.0"])
    assert.ok(reviewLifecycle(policy, version, now).length);
});
test("review deadline fails exactly at UTC midnight without automatic renewal", () => {
  assert.deepEqual(
    reviewLifecycle(policy, "24.0.0", new Date("2026-11-12T23:59:59Z")),
    [],
  );
  assert.match(
    reviewLifecycle(policy, "24.0.0", new Date("2026-11-13T00:00:00Z")).join(),
    /needs review/,
  );
});
test("renewing review cannot keep an EOL Node runtime supported", () => {
  const renewed = { ...policy, reviewBy: "2030-01-01" };
  assert.match(
    reviewLifecycle(
      renewed,
      "22.18.0",
      new Date("2027-04-30T00:00:00Z"),
    ).join(),
    /support window/,
  );
});
test("invalid or impossible policy dates fail closed", () => {
  const now = new Date("2026-10-16T00:00:00Z");
  for (const reviewBy of ["invalid", "2026-02-30", "2026-13-01"])
    assert.ok(reviewLifecycle({ ...policy, reviewBy }, "24.0.0", now).length);
  assert.ok(
    reviewLifecycle(
      { ...policy, nodeSupport: { 24: { end: "invalid" } } },
      "24.0.0",
      now,
    ).length,
  );
});
