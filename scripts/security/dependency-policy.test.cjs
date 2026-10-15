const { test } = require("node:test");
const assert = require("node:assert/strict");
const { reviewAudit } = require("./dependency-policy.cjs");
function fixture() {
  return {
    metadata: { vulnerabilities: {} },
    vulnerabilities: {
      braces: {
        name: "braces",
        nodes: ["node_modules/braces"],
        via: [
          {
            name: "braces",
            url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
            severity: "high",
            range: "<=3.0.3",
          },
        ],
      },
    },
  };
}
const lock = { packages: { "node_modules/braces": { dev: true } } };
const now = new Date("2026-10-13");
test("only reviewed dev advisories are accepted until their review deadline", () => {
  assert.deepEqual(reviewAudit(fixture(), lock, now), []);
  assert.ok(reviewAudit(fixture(), lock, new Date("2026-11-13")).length);
});
test("new advisories and runtime or unknown paths fail closed", () => {
  assert.ok(reviewAudit(fixture(), { packages: {} }, now).length);
  const report = fixture();
  report.vulnerabilities.braces.via[0].url =
    "https://github.com/advisories/new";
  assert.ok(reviewAudit(report, lock, now).length);
  assert.throws(() => reviewAudit({ error: {} }, lock, now));
});
