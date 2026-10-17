const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "../../../../..");
process.chdir(root);
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
function command(file, args, input) {
  const r = cp.spawnSync(file, args, {
    cwd: root,
    encoding: "utf8",
    input,
    timeout: 30000,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  return { exitCode: r.status, stdout: r.stdout || "" };
}
function git(args, input) {
  const r = command("git", args, input);
  if (r.exitCode !== 0) throw Error(`git ${args[0]} failed`);
  return r.stdout.trim();
}
function read(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function save(file, value) {
  fs.writeFileSync(
    path.join(__dirname, file),
    JSON.stringify(value, null, 2) + "\n",
  );
}
const locations = [
  __dirname,
  ...fs
    .readdirSync(__dirname)
    .filter((n) => /^revision-\d+$/.test(n))
    .map((n) => path.join(__dirname, n)),
];
const candidates = locations
  .filter((dir) => fs.existsSync(path.join(dir, "candidate.json")))
  .map((dir) => ({ dir, candidate: read(path.join(dir, "candidate.json")) }))
  .sort((a, b) => a.candidate.createdAt.localeCompare(b.candidate.createdAt));
const active = candidates.at(-1);
if (!active) throw Error("Candidate evidence missing");
const runHistory = candidates.map(({ dir, candidate }) => {
  const observations = fs
    .readdirSync(dir)
    .filter((n) => /^remote-ci-\d+\.json$/.test(n))
    .sort();
  if (!observations.length) throw Error("CI observations missing");
  const observation = read(path.join(dir, observations.at(-1)));
  if (observation.candidateCommit !== candidate.commit)
    throw Error("Observation candidate mismatch");
  for (const run of observation.runs) {
    if (
      run.headSha !== candidate.commit ||
      run.branch !== candidate.branch ||
      run.event !== "push"
    )
      throw Error("CI source binding mismatch");
    for (const log of run.logEvidence || []) {
      if (
        log.file &&
        sha256(fs.readFileSync(path.join(dir, log.file))) !== log.sha256
      )
        throw Error("CI log digest mismatch");
    }
  }
  return {
    candidateCommit: candidate.commit,
    branch: candidate.branch,
    observationFile: path
      .relative(__dirname, path.join(dir, observations.at(-1)))
      .replaceAll("\\", "/"),
    ...observation,
  };
});
const current = runHistory.at(-1);
if (current.status !== "completed" || !current.runs.length)
  throw Error("CI has not reached a terminal state");
const testSummaries = [];
const containerBuildLogLines = [];
for (const run of current.runs) {
  for (const log of run.logEvidence || []) {
    if (!log.file) continue;
    const lines = fs
      .readFileSync(path.join(active.dir, log.file), "utf8")
      .replace(/\x1b\[[0-9;]*m/g, "")
      .split(/\r?\n/);
    let commandName = null;
    for (const line of lines) {
      if (line.includes("##[group]Run "))
        commandName = line.split("##[group]Run ")[1];
      if (
        /Test Suites:|Tests:|(?:#|ℹ) (?:tests|pass|fail) |\b\d+ passed \(|All files\s+\|/.test(
          line,
        )
      )
        testSummaries.push({ command: commandName, line });
      if (
        /writing image sha256:|exporting (?:manifest|config) sha256:|naming to docker.io\/library\/atlas-/.test(
          line,
        )
      )
        containerBuildLogLines.push({ command: commandName, line });
    }
  }
}
save("test-summary.json", {
  at: new Date().toISOString(),
  candidateCommit: active.candidate.commit,
  note: "Verbatim summary lines from the current remote job log. Security subsets overlap unit tests; do not sum as unique test counts.",
  testSummaries,
  containerBuildLogLines,
});
const requiredSteps = [
  "Run npm ci",
  "Run npm run test:security:db",
  "Run npm run format:check:reliability",
  "Run npm run lint",
  "Run npm exec --workspace=@atlas/api -- tsc --noEmit",
  "Run npm run typecheck --workspace=@atlas/web-admin",
  "Run npm run test:security",
  "Run npm audit --omit=dev --audit-level=moderate",
  "Run npm run audit:dependencies",
  "Run npm run test:cov --workspace=@atlas/api -- --runInBand",
  "Run npm run test:int --workspace=@atlas/api",
  "Run npm run test:e2e --workspace=@atlas/api",
  "Run npm run build",
  "Run npm run test:browser",
  "Build API container",
  "Build web container",
];
const stepResults = requiredSteps.map((name) => ({
  name,
  conclusion:
    current.runs
      .flatMap((r) => r.jobs)
      .flatMap((j) => j.steps)
      .find((s) => s.name === name)?.conclusion || "missing",
}));
const ciPassed =
  current.runs.every(
    (r) =>
      r.conclusion === "success" &&
      r.jobs.every((j) => j.conclusion === "success"),
  ) && stepResults.every((s) => s.conclusion === "success");

const blobChecks = [];
for (const blob of active.candidate.blobs) {
  const exists = fs.existsSync(blob.path);
  const actual = exists
    ? git(
        ["hash-object", "--path", blob.path, "--stdin"],
        fs.readFileSync(blob.path),
      )
    : null;
  if (actual !== blob.oid)
    blobChecks.push({
      path: blob.path,
      expected: blob.oid,
      actual,
      documentationOnly: blob.path.endsWith(".md"),
    });
}
const candidatePaths = new Set(active.candidate.blobs.map((b) => b.path));
const unrepresentedSource = git([
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
      !file.endsWith(".md") &&
      (/^(apps|scripts|tests|nginx|\.github)\//.test(file) ||
        /^(package(-lock)?\.json|docker-compose.*\.yml|playwright\.config\.ts|Caddyfile|turbo\.json|\.dockerignore|\.gitignore)$/.test(
          file,
        )) &&
      !candidatePaths.has(file),
  );
const runtimeSourceMatches =
  blobChecks.every((b) => b.documentationOnly) &&
  unrepresentedSource.length === 0;
const baseline = read(path.join(__dirname, "initial-file-hashes.json"));
const expectedChanges = [
  ".github/workflows/ci.yml",
  "tests/browser/auth-forms.spec.ts",
  "tests/browser/security-flows.spec.ts",
  "apps/api/src/modules/auth/services/auth.service.ts",
  "apps/api/test/unit/modules/user/user.service.spec.ts",
  "apps/api/test/unit/security/audit-attribution.spec.ts",
  "docs/improvements/phase-3/FINAL-IMPROVEMENT-REPORT.md",
  "docs/improvements/phase-3/PRODUCTION-READINESS.md",
];
const modified = [],
  missing = [];
for (const [file, hash] of Object.entries(baseline)) {
  if (!fs.existsSync(file)) missing.push(file);
  else if (sha256(fs.readFileSync(file)) !== hash) modified.push(file);
}
const originalIndex = git(["rev-parse", "--git-path", "index"]);
const preservation = {
  at: new Date().toISOString(),
  baselineFiles: Object.keys(baseline).length,
  unchanged: Object.keys(baseline).length - modified.length - missing.length,
  modified,
  missing,
  unexpectedModified: modified.filter((f) => !expectedChanges.includes(f)),
  headUnchanged: git(["rev-parse", "HEAD"]) === active.candidate.originalHead,
  branchUnchanged:
    git(["branch", "--show-current"]) === active.candidate.originalBranch,
  indexUnchanged:
    sha256(fs.readFileSync(originalIndex)) ===
    active.candidate.originalIndexSha256,
  runtimeAndDeploymentSourceMatchesCandidate: runtimeSourceMatches,
  candidateDocumentationDrift: blobChecks.filter((b) => b.documentationOnly),
  unexpectedSourceDrift: blobChecks.filter((b) => !b.documentationOnly),
  unrepresentedSource,
};
save("preservation-check.json", preservation);

const discovery = read(path.join(__dirname, "discovery-1792061733010.json"));
const before = discovery.probes.find(
  (p) => p.name === "container-inventory",
).containers;
const docker = command("docker", [
  "ps",
  "-a",
  "--no-trunc",
  "--format",
  "{{json .}}",
]);
if (docker.exitCode !== 0) throw Error("Final Docker inventory unavailable");
const containers = docker.stdout
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const c = JSON.parse(line);
    return { id: c.ID, name: c.Names, image: c.Image, state: c.State };
  });
const changedContainers = before.filter(
  (b) =>
    !containers.some(
      (c) =>
        c.id === b.id &&
        c.name === b.name &&
        c.image === b.image &&
        c.state === b.state,
    ),
);
save("containers-after.json", {
  at: new Date().toISOString(),
  containers,
  changedContainers,
  addedContainers: containers.filter((c) => !before.some((b) => b.id === c.id)),
});

const scripts = [
  "scripts/security/phase3f-release-audit.cjs",
  path.relative(root, path.join(__dirname, "download-browser-artifact.cjs")),
  path.relative(root, path.join(__dirname, "remote-ci.cjs")),
  path.relative(root, __filename),
];
const syntax = scripts.map((file) => ({
  file,
  exitCode: command(process.execPath, ["--check", file]).exitCode,
}));
const formatFiles = [
  ".github/workflows/ci.yml",
  "tests/browser/auth-forms.spec.ts",
  ...scripts,
  "docs/improvements/phase-3/PHASE-3F-RELEASE-EVIDENCE.md",
  path.relative(root, path.join(__dirname, "README.md")),
];
const format = command(process.execPath, [
  "node_modules/prettier/bin/prettier.cjs",
  "--check",
  ...formatFiles,
]);
const linkFiles = [
  "docs/improvements/phase-3/PHASE-3F-RELEASE-EVIDENCE.md",
  path.relative(root, path.join(__dirname, "README.md")),
];
const missingLinks = [];
let linkCount = 0;
for (const file of linkFiles) {
  for (const match of fs
    .readFileSync(file, "utf8")
    .matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(https?:|#)/.test(match[1])) continue;
    linkCount++;
    const target = match[1].split("#")[0];
    if (
      !fs.existsSync(path.resolve(path.dirname(file), target)) &&
      !target.endsWith("release-evidence.json")
    )
      missingLinks.push({ file, target });
  }
}
const qa = {
  at: new Date().toISOString(),
  syntax,
  formatExitCode: format.exitCode,
  links: { checked: linkCount, missing: missingLinks },
};
save("artifact-qa.json", qa);
const formattingVerification = read(
  path.join(__dirname, "formatting-verification.json"),
);
const formattingOnly =
  formattingVerification.checks.length === 4 &&
  formattingVerification.checks.every(
    (c) => c.canonicalSourceIdentical && c.formattedEmittedJavaScriptIdentical,
  );
const integrityPassed =
  preservation.unexpectedModified.length === 0 &&
  missing.length === 0 &&
  preservation.headUnchanged &&
  preservation.branchUnchanged &&
  preservation.indexUnchanged &&
  runtimeSourceMatches &&
  changedContainers.length === 0 &&
  syntax.every((s) => s.exitCode === 0) &&
  format.exitCode === 0 &&
  formattingOnly &&
  missingLinks.length === 0;
const summary = {
  at: new Date().toISOString(),
  timezone: "Asia/Jakarta",
  phase: "3F",
  status: "release-held",
  releaseReady: false,
  candidate: {
    commit: active.candidate.commit,
    tree: active.candidate.tree,
    branch: active.candidate.branch,
    sourceFileCount: active.candidate.sourceFileCount,
  },
  gates: [
    {
      gate: "remote-ci",
      status: ciPassed && runtimeSourceMatches ? "passed" : "failed",
      runs: current.runs.map((r) => ({
        id: r.id,
        url: r.url,
        headSha: r.headSha,
        conclusion: r.conclusion,
      })),
      stepResults,
    },
    {
      gate: "staging-tls-secrets-grants",
      status: "blocked",
      execution: "not-executed",
      reason:
        "No identified staging endpoint or operator connection; metadata discovery is not runtime validation.",
    },
    {
      gate: "off-host-restore",
      status: "blocked",
      execution: "not-executed",
      reason:
        "No identified separate recovery host, backup/key access, recovery owner or RTO/RPO.",
    },
    {
      gate: "compatible-release-rollback",
      status: "blocked",
      execution: "not-executed",
      reason:
        "No reviewed previous API/web release digest pair carrying compatible archive reader and lease fencing.",
    },
  ],
  runHistory,
  testSummaries,
  containerBuildLogLines,
  integrityPassed,
  preservation,
  formattingOnly,
  scope:
    "Remote GitHub CI on synthetic disposable runner services; local read-only discovery. No staging/production deployment, off-host restore, or release rollback occurred.",
  evidenceDigests: [],
};
for (const dir of locations) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (!fs.statSync(file).isFile() || ["release-evidence.json"].includes(name))
      continue;
    summary.evidenceDigests.push({
      file: path.relative(__dirname, file).replaceAll("\\", "/"),
      sha256: sha256(fs.readFileSync(file)),
      bytes: fs.statSync(file).size,
    });
  }
}
save("release-evidence.json", summary);
console.log(
  JSON.stringify(
    {
      status: summary.status,
      remoteCI: summary.gates[0].status,
      integrityPassed,
      sourceDrift: preservation.unexpectedSourceDrift,
      qa,
    },
    null,
    2,
  ),
);
if (!integrityPassed) process.exitCode = 1;
