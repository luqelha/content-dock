const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../..");
process.chdir(root);
const dir = path.join(root, "docs/improvements/phase-4/evidence/phase-4a");
const hash = (data) => crypto.createHash("sha256").update(data).digest("hex");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const save = (name, data) =>
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2) + "\n");
function command(file, args) {
  const r = cp.spawnSync(file, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 60000,
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(r.status, 0, `${file} ${args[0]} failed`);
  return r.stdout;
}
const latest = {};
for (const name of fs
  .readdirSync(dir)
  .filter((n) => /^check-.*\.json$/.test(n))) {
  const r = read(path.join(dir, name));
  r.file = name;
  if (!latest[r.operation] || r.finishedAt > latest[r.operation].finishedAt)
    latest[r.operation] = r;
}
const required = [
  "types",
  "lint",
  "unit",
  "security",
  "audit",
  "observability",
  "rules",
  "prometheus",
  "alertmanager",
  "build",
  "imageApi",
  "imageJournal",
];
for (const name of required) {
  assert.ok(latest[name], `Missing ${name}`);
  assert.equal(latest[name].exitCode, 0, `${name} failed`);
  assert.equal(
    hash(fs.readFileSync(path.join(dir, latest[name].log))),
    latest[name].logSha256,
  );
}
const attempts = fs
  .readdirSync(dir)
  .filter((n) => /^drill-\d+\.json$/.test(n))
  .map((name) => ({ file: name, ...read(path.join(dir, name)) }))
  .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
const runtime = attempts.at(-1);
assert.equal(runtime.status, "passed");
assert.equal(runtime.checkpoints.length, 9);
assert.ok(runtime.checkpoints.every((c) => c.status === "passed"));
assert.equal(runtime.existingContainersChanged.length, 0);
assert.ok(!runtime.cleanupError);
const regressions = fs
  .readdirSync(dir)
  .filter((n) => /^database-regression-\d+\.json$/.test(n))
  .sort();
const regression = read(path.join(dir, regressions.at(-1)));
assert.equal(regression.status, "passed");
assert.equal(regression.checks.length, 3);
for (const check of regression.checks) {
  assert.equal(check.exitCode, 0);
  assert.equal(
    hash(fs.readFileSync(path.join(dir, check.log))),
    check.logSha256,
  );
}
const clean = (text) => text.replace(/\x1b\[[0-9;]*m/g, "");
function jestCount(log) {
  const text = clean(fs.readFileSync(path.join(dir, log), "utf8"));
  const match = [...text.matchAll(/Tests:\s+(\d+) passed,\s+(\d+) total/g)].at(
    -1,
  );
  assert.ok(match, "Missing Jest totals");
  assert.equal(match[1], match[2]);
  return Number(match[1]);
}
const counts = {
  unit: jestCount(latest.unit.log),
  integration: jestCount(
    regression.checks.find((c) => c.name === "integration").log,
  ),
  e2e: jestCount(regression.checks.find((c) => c.name === "e2e").log),
  observabilityRuleScenarios: read(
    path.join(root, "ops/observability/alerts.test.json"),
  ).tests.length,
  ruleCount: (
    fs
      .readFileSync(path.join(root, "ops/observability/alerts.yml"), "utf8")
      .match(/- alert:/g) || []
  ).length,
  dashboardPanels: 26,
  runtimeCheckpoints: 9,
};
assert.equal(counts.unit, 193);
assert.equal(counts.integration, 26);
assert.equal(counts.e2e, 19);
assert.equal(counts.observabilityRuleScenarios, 18);
assert.equal(counts.ruleCount, 16);
const testedNames = new Set(
  read(path.join(root, "ops/observability/alerts.test.json")).tests.flatMap(
    (t) => t.alert_rule_test.map((a) => a.alertname),
  ),
);
const ruleNames = [
  ...fs
    .readFileSync(path.join(root, "ops/observability/alerts.yml"), "utf8")
    .matchAll(/- alert: (\w+)/g),
].map((m) => m[1]);
assert.ok(
  ruleNames.every((name) => testedNames.has(name)),
  "An alert lacks a rule test",
);
const imageCode = read(path.join(dir, "image-code-verification.json"));
assert.equal(imageCode.identical, true);
assert.equal(imageCode.imageId, runtime.apiImage);
const baseline = read(path.join(dir, "initial-file-hashes.json"));
const expected = [
  ".github/workflows/ci.yml",
  ".env.production.example",
  "apps/api/.env.example",
  "apps/api/package.json",
  "package-lock.json",
  "package.json",
  "README.md",
  "docker-compose.prod.yml",
  "apps/api/src/main.ts",
  "apps/api/src/app.module.ts",
  "apps/api/src/config/env.validation.ts",
  "apps/api/src/database/prisma.service.ts",
  "apps/api/src/modules/redis/redis.service.ts",
  "apps/api/src/modules/export/export.service.ts",
  "apps/api/src/modules/export/worker.controller.ts",
  "apps/api/src/common/interceptors/cache.interceptor.ts",
  "apps/api/src/modules/storage/storage-retention.service.ts",
];
const modified = [],
  missing = [];
for (const [file, digest] of Object.entries(baseline)) {
  if (!fs.existsSync(file)) missing.push(file);
  else if (hash(fs.readFileSync(file)) !== digest) modified.push(file);
}
const git = (args) => command("git", args).trim();
const originalIndex = read(
  path.join(root, "docs/improvements/phase-3/evidence/phase-3f/candidate.json"),
).originalIndexSha256;
const preservation = {
  at: new Date().toISOString(),
  baselineFiles: Object.keys(baseline).length,
  unchanged: Object.keys(baseline).length - modified.length - missing.length,
  modified,
  missing,
  unexpectedModified: modified.filter((f) => !expected.includes(f)),
  head: git(["rev-parse", "HEAD"]),
  branch: git(["branch", "--show-current"]),
  indexMatchesPhase3FBaseline:
    hash(fs.readFileSync(git(["rev-parse", "--git-path", "index"]))) ===
    originalIndex,
};
assert.equal(preservation.missing.length, 0);
assert.equal(preservation.unexpectedModified.length, 0);
assert.equal(preservation.head, "e78af99e234687377d0f35a91128e66ac2ace72f");
assert.equal(preservation.indexMatchesPhase3FBaseline, true);
save("preservation-check.json", preservation);
const current = command("docker", [
  "ps",
  "-a",
  "--no-trunc",
  "--format",
  "{{json .}}",
])
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const c = JSON.parse(line);
    return { id: c.ID, name: c.Names, image: c.Image, state: c.State };
  });
const before = read(path.join(dir, "containers-before.json")).containers;
const existingChanged = before.filter(
  (b) =>
    !current.some(
      (c) =>
        c.id === b.id &&
        c.name === b.name &&
        c.image === b.image &&
        c.state === b.state,
    ),
);
const taskContainers = current.filter((c) =>
  c.name.startsWith("atlas-phase4a-"),
);
assert.equal(existingChanged.length, 0);
assert.ok(
  taskContainers.every(
    (c) => !["running", "paused", "restarting"].includes(c.state),
  ),
  "Task container remains active",
);
save("containers-after.json", {
  at: new Date().toISOString(),
  baseline: before.length,
  existingChanged,
  taskContainers,
  containers: current,
  volumesRetained: true,
});
const images = JSON.parse(
  command("docker", [
    "image",
    "inspect",
    "atlas-api:phase4a",
    "atlas-alert-journal:phase4a",
    "prom/prometheus:v3.15.0",
    "prom/alertmanager:v0.34.1",
    "grafana/grafana:13.2.4",
  ]),
).map((i) => ({
  id: i.Id,
  tags: i.RepoTags,
  repoDigests: i.RepoDigests,
  os: i.Os,
  architecture: i.Architecture,
}));
save("images.json", { at: new Date().toISOString(), images });
function walk(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((item) => {
    const file = path.join(folder, item.name);
    return item.isDirectory() ? walk(file) : [file];
  });
}
const scripts = [
  ...walk(path.join(root, "scripts/observability")).filter((f) =>
    f.endsWith(".cjs"),
  ),
  ...walk(path.join(root, "ops/observability")).filter((f) =>
    f.endsWith(".cjs"),
  ),
];
const syntax = scripts.map((file) => {
  command(process.execPath, ["--check", file]);
  return { file: path.relative(root, file).replaceAll("\\", "/"), exitCode: 0 };
});
const formatFiles = [
  ".github/workflows/ci.yml",
  "package.json",
  "docker-compose.prod.yml",
  "docker-compose.observability.yml",
  "apps/api/src/modules/observability",
  "apps/api/test/unit/observability.spec.ts",
  "scripts/observability",
  "docs/improvements/phase-4/OBSERVABILITY.md",
  "docs/improvements/phase-4/OPERATIONAL-RUNBOOKS.md",
  "docs/improvements/phase-4/PHASE-4A-REPORT.md",
  "docs/improvements/phase-4/evidence/phase-4a/README.md",
  ...walk(path.join(root, "ops/observability")).filter((f) =>
    /\.(json|yml|cjs)$/.test(f),
  ),
];
command(process.execPath, [
  "node_modules/prettier/bin/prettier.cjs",
  "--check",
  ...formatFiles,
]);
const docs = [
  "README.md",
  ...walk(path.join(root, "docs/improvements/phase-4")).filter((f) =>
    f.endsWith(".md"),
  ),
];
let checkedLinks = 0;
const brokenLinks = [];
for (const file of docs)
  for (const match of fs
    .readFileSync(file, "utf8")
    .matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(https?:|#)/.test(match[1])) continue;
    checkedLinks++;
    const target = match[1].split("#")[0];
    if (
      !fs.existsSync(path.resolve(path.dirname(file), target)) &&
      !target.endsWith("validation-summary.json")
    )
      brokenLinks.push({ file, target });
  }
assert.equal(brokenLinks.length, 0);
const qa = {
  at: new Date().toISOString(),
  syntax,
  formatPassed: true,
  links: { checked: checkedLinks, broken: brokenLinks },
  allAlertRulesHaveTests: true,
};
save("artifact-qa.json", qa);
const sourceFiles = git([
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "-z",
])
  .split("\0")
  .filter(
    (file) =>
      file &&
      fs.existsSync(file) &&
      !file.startsWith("docs/improvements/phase-4/evidence/phase-4a/"),
  );
const sourceHashes = Object.fromEntries(
  [...new Set(sourceFiles)]
    .sort()
    .map((file) => [file, hash(fs.readFileSync(file))]),
);
save("source-file-hashes.json", sourceHashes);
const summary = {
  at: new Date().toISOString(),
  timezone: "Asia/Jakarta",
  phase: "4A",
  status: "passed-local-synthetic",
  productionReady: false,
  remoteCI: "not-executed-for-phase4a; workflow gate added",
  scope:
    "Working tree; private operational package and new local synthetic fixture. No staging/production rollout.",
  counts,
  checks: Object.fromEntries(required.map((name) => [name, latest[name]])),
  databaseRegression: { file: regressions.at(-1), ...regression },
  runtime: {
    file: runtime.file,
    project: runtime.project,
    image: runtime.apiImage,
    checkpoints: runtime.checkpoints,
    faults: runtime.faults,
  },
  attempts: attempts.map((r) => ({
    file: r.file,
    project: r.project,
    status:
      r.status === "running" ? "interrupted-see-interruption-record" : r.status,
    error: r.error,
    checkpoints: r.checkpoints.length,
  })),
  imageCode,
  preservation,
  qa,
  limitations: [
    "Human on-call paging receiver and owner are not configured; firing/resolved delivery tested to internal durable journal only.",
    "No remote CI execution for this new working tree.",
    "No staging TLS/secrets/grants, off-host restore, or reviewed release rollback pair; Phase 3F gates remain open.",
    "Local fault timings are not production RTO/RPO or workload capacity.",
    "DB operation timing includes client queue wait, not a separate pool-wait metric; broker exporter metrics are aggregate.",
  ],
  evidenceDigests: [],
};
for (const file of walk(dir)) {
  if (path.basename(file) === "validation-summary.json") continue;
  summary.evidenceDigests.push({
    file: path.relative(dir, file).replaceAll("\\", "/"),
    sha256: hash(fs.readFileSync(file)),
    bytes: fs.statSync(file).size,
  });
}
save("validation-summary.json", summary);
console.log(
  JSON.stringify(
    {
      status: summary.status,
      counts,
      preservedOriginalContainers: before.length,
      unchangedFiles: preservation.unchanged,
      modifiedExistingFiles: modified.length,
      indexPreserved: preservation.indexMatchesPhase3FBaseline,
      allTaskContainersStopped: true,
      imageCompiledFilesMatched: imageCode.compiledFiles,
      evidenceFiles: summary.evidenceDigests.length,
    },
    null,
    2,
  ),
);
