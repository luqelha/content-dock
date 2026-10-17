const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../../../../..");
process.chdir(root);
const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, name), "utf8"));
const write = (name, data) =>
  fs.writeFileSync(
    path.join(__dirname, name),
    JSON.stringify(data, null, 2) + "\n",
  );
const checks = [
  "unit",
  "security",
  "lintApi",
  "lintWeb",
  "typesApi",
  "typesWeb",
  "format",
  "auditRuntime",
  "auditAll",
  "generate",
  "migrate",
  "migrationStatus",
  "provision",
  "grants",
  "integration",
  "e2e",
  "buildApi",
  "buildWeb",
  "browser",
  "proxy",
  "recovery",
  "imageApi",
  "imageWeb",
  "imageApi-resume",
  "imageWeb-resume",
  "restore-resume",
];
const results = checks.map((name) => ({
  artifact: name + ".json",
  ...read(name + ".json"),
}));
for (const result of results)
  assert.equal(
    result.exitCode,
    result.artifact === "auditAll.json" ? 1 : 0,
    result.artifact,
  );
const policy = read("audit-policy.json");
assert.deepEqual(policy.failures, []);
assert.equal(policy.counts.total, 48);
const runtime = JSON.parse(
  fs.readFileSync(path.join(__dirname, "auditRuntime.log"), "utf8"),
);
assert.equal(runtime.metadata.vulnerabilities.total, 0);
const recovery = read("recovery-drill.json");
assert.equal(recovery.steps.length, 3);
assert.ok(recovery.steps.every((s) => s.status === "passed"));
const drills = fs
  .readdirSync(__dirname)
  .filter((f) => /^drill-\d+\.json$/.test(f))
  .sort();
assert.ok(drills.length, "Need a completed restore report");
const drillName = drills.at(-1);
const drill = read(drillName);
assert.equal(drill.status, "passed");
assert.ok(!drill.cleanupError);
assert.ok(drill.unverified.some((g) => /Rollback/.test(g)));
const resources = read("containers-after.json");
assert.equal(resources.existingChecked, 3);
assert.deepEqual(resources.existingChanges, []);
assert.deepEqual(resources.drillContainersRunning, []);
assert.equal(resources.drillContainerCount, 14);
const counts = {};
for (const [name, expected] of Object.entries({
  unit: 153,
  integration: 26,
  e2e: 19,
})) {
  const log = fs.readFileSync(path.join(__dirname, name + ".log"), "utf8");
  const match = log.match(/Tests:\s+(\d+) passed,\s+(\d+) total/);
  assert.ok(match, name);
  assert.equal(Number(match[1]), expected);
  assert.equal(Number(match[2]), expected);
  counts[name] = expected;
}
const security = fs.readFileSync(path.join(__dirname, "security.log"), "utf8");
assert.match(security, /Tests:\s+101 passed,\s+101 total/);
assert.match(security, /# pass 24/);
assert.match(security, /# fail 0/);
const browser = fs.readFileSync(path.join(__dirname, "browser.log"), "utf8");
assert.match(browser, /3 passed/);
const grants = fs.readFileSync(path.join(__dirname, "grants.log"), "utf8");
assert.match(grants, /# pass 3/);
assert.match(grants, /# fail 0/);
Object.assign(counts, {
  securityApiSubset: 101,
  securityNode: 24,
  grants: 3,
  browser: 3,
  uniqueTests: 228,
});
write("validation-summary.json", {
  finalizedAt: new Date().toISOString(),
  timezone: "Asia/Jakarta",
  head: cp.execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
  scope:
    "working tree; local synthetic fixtures; not remote CI or production release",
  testsExecutedOn: "2026-10-14",
  resumedOn: "2026-10-15",
  regressionStatus: "passed",
  phase3Acceptance: "partially completed",
  productionReadiness:
    "not ready: external operational gates and compatible release rollback evidence required",
  counts,
  coverage: read("coverage.json").total,
  runtimeAudit: runtime.metadata.vulnerabilities,
  toolingAudit: policy,
  safetyReview: {
    existingDataOrVolumesDeleted: false,
    proceduralDeviation:
      "Registry probe using rabbitmq image and --rm automatically created and deleted one new anonymous diagnostic volume. This violates the no-volume-deletion procedure; no existing volume was mounted or removed.",
    evidence: "diagnostic-volume-review.json",
    interruption:
      "Docker state changed between sessions; resumed container preservation is checked separately.",
  },
  recovery,
  resourcePreservation: {
    evidence: "containers-after.json",
    existingUnchanged: resources.existingChecked,
    drillContainersStopped: resources.drillContainerCount,
    projectVolumesRetained: resources.projectVolumes.reduce(
      (n, p) => n + p.volumes.length,
      0,
    ),
  },
  restore: {
    artifact: drillName,
    status: drill.status,
    checkpoints: drill.steps.length,
    images: drill.images,
    projects: drill.projects,
    unverified: drill.unverified,
  },
  results,
  limitations: [
    "Windows Node 22 local suite is not Ubuntu Node 24 GitHub Actions",
    "Chromium only; no manual screen reader or other browsers",
    "No fresh HTTP before/after benchmark",
    "No production TLS/secrets/grants/off-host recovery",
    "No compatible previous-release rollback rehearsal",
    "Docker baseline changed during interruption; preservation checked separately for resumed work",
  ],
});
const initial = read("initial-file-hashes.json");
const allowedDocs = [
  "docs/improvements/phase-3/PRODUCTION-READINESS.md",
  "docs/improvements/phase-3/TEST-COVERAGE-REPORT.md",
  "docs/improvements/phase-3/DEPLOYMENT-RUNBOOK.md",
];
const hash = (p) =>
  crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const modified = [],
  missing = [];
for (const [p, before] of Object.entries(initial)) {
  if (!fs.existsSync(p)) missing.push(p);
  else if (hash(p) !== before) modified.push(p);
}
const unexpected = modified.filter((p) => !allowedDocs.includes(p));
write("preservation-check.json", {
  checkedFiles: Object.keys(initial).length,
  unchanged: Object.keys(initial).length - modified.length - missing.length,
  intentionalDocumentationChanges: modified.filter((p) =>
    allowedDocs.includes(p),
  ),
  unexpectedChanges: unexpected,
  missing,
  scope:
    "Existing non-ignored files; generated files and Docker state are separate",
});
assert.deepEqual(missing, []);
assert.deepEqual(unexpected, []);
const files = [
  ...new Set(
    cp
      .execFileSync("git", [
        "ls-files",
        "--cached",
        "--others",
        "--exclude-standard",
        "-z",
      ])
      .toString()
      .split("\0")
      .filter(Boolean),
  ),
];
const manifestPath = path
  .relative(root, path.join(__dirname, "changed-files.json"))
  .split(path.sep)
  .join("/");
const changes = files
  .filter(
    (p) =>
      p !== manifestPath &&
      fs.existsSync(p) &&
      fs.statSync(p).isFile() &&
      (!initial[p] || hash(p) !== initial[p]),
  )
  .sort()
  .map((p) => ({
    path: p,
    status: initial[p] ? "modified" : "added",
    sha256: hash(p),
  }));
write("changed-files.json", {
  relativeTo: "Phase 3E initial-file-hashes.json, not Git HEAD",
  excluded: [
    "changed-files.json self hash",
    "ignored logs and generated outputs",
  ],
  files: changes,
});
console.log(
  JSON.stringify({
    regression: "passed",
    uniqueTests: counts.uniqueTests,
    restore: drill.status,
    checkpoints: drill.steps.length,
    unexpectedChanges: unexpected.length,
    changedFiles: changes.length,
  }),
);
