const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ts = require("typescript");
const apiRequire = require("node:module").createRequire(
  path.resolve("apps/api/package.json"),
);
const evidence = "docs/improvements/phase-4/evidence/phase-4c";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const unit = read(evidence + "/unit-results.json");
const coverage = apiRequire("istanbul-lib-coverage").createCoverageMap(
  read("apps/api/coverage/coverage-final.json"),
);
const total = coverage.getCoverageSummary().toJSON();
const worker = coverage
  .fileCoverageFor(
    coverage.files().find((p) => p.endsWith("worker.controller.ts")),
  )
  .toSummary()
  .toJSON();
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((x) =>
      x.isDirectory()
        ? files(path.join(dir, x.name))
        : [path.join(dir, x.name)],
    );
}
const anys = [];
for (const file of files("apps/api/src").filter((f) => f.endsWith(".ts"))) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const loc = source.getLineAndCharacterOfPosition(node.getStart(source));
      anys.push({
        file: file.replaceAll("\\", "/"),
        line: loc.line + 1,
        column: loc.character + 1,
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const checks = fs
  .readdirSync(evidence)
  .filter((n) => /^check-.*\.json$/.test(n))
  .map((n) => ({ ...read(evidence + "/" + n), evidence: n }));
const databases = fs
  .readdirSync(evidence)
  .filter((n) => /^database-regression-\d+\.json$/.test(n))
  .map((n) => ({ evidence: n, ...read(evidence + "/" + n) }));
const contracts = unit.testResults.filter((r) => r.name.includes("contracts"));
const summary = {
  date: "2026-10-16",
  timezone: "Asia/Jakarta",
  generatedAt: new Date().toISOString(),
  scope:
    "Phase 4C: strictNullChecks/noImplicitAny plus typed request, content, media and export contracts",
  status:
    checks.every((c) => c.exitCode === 0) &&
    unit.success &&
    databases.every((d) => d.status === "passed")
      ? "passed"
      : "failed",
  versions: {
    node: process.version,
    typescript: ts.version,
    nest: apiRequire("@nestjs/common/package.json").version,
    prisma: apiRequire("@prisma/client/package.json").version,
    next: require("next/package.json").version,
    zod: require("zod/package.json").version,
  },
  strictness: {
    baseline: {
      source: "Initial non-emitting compiler probe captured in task output",
      flags: ["strictNullChecks", "noImplicitAny"],
      diagnostics: 42,
      sourceDiagnostics: 30,
      testDiagnostics: 12,
    },
    final: {
      apiCompilerOptions: read("apps/api/tsconfig.json").compilerOptions,
      diagnostics: 0,
      sourceAndTestsIncluded: true,
      fullStrictEnabled: false,
    },
    remainingExplicitAny: {
      count: anys.length,
      scope:
        "API source AST only; excludes tests, dependencies and implicit any flows",
      locations: anys,
    },
  },
  tests: {
    unit: {
      passed: unit.numPassedTests,
      failed: unit.numFailedTests,
      suites: unit.numPassedTestSuites,
      totalSuites: unit.numTotalTestSuites,
      snapshots: unit.snapshot.matched,
      contracts: contracts.reduce((n, r) => n + r.assertionResults.length, 0),
    },
    nodeConsumerContracts: { passed: 7, evidence: "check-web-contracts.json" },
    nodeSecurity: {
      passed: 32,
      exitCode: 0,
      command: "node --test scripts/security/*.test.cjs",
      evidence:
        "Executed together with consumer contracts; 39 total passing tests in task output; individual security log not retained",
    },
    integration: { passed: 27, suites: 4 },
    apiE2e: { passed: 19, suites: 3 },
    browser: "not run",
  },
  coverage: { total, worker, thresholdsUnchanged: true },
  checks,
  database: databases.map((d) => ({
    evidence: d.evidence,
    project: d.project,
    status: d.status,
    volumesRetained: d.volumesRetained,
    checks: d.checks,
  })),
  finalTestLint: {
    exitCode: 0,
    command:
      "node node_modules/eslint/bin/eslint.js test/unit/contracts/export.contract.spec.ts test/unit/modules/user/user.service.spec.ts",
    cwd: "apps/api",
    evidence: "Task tool output; no separate log retained",
  },
  limitations: [
    "Two target flags enabled; remaining strict family is not globally enabled",
    "No remote CI, browser E2E, new Docker image or production deployment",
    "Working tree contained extensive user changes; no pre-task preservation snapshot was taken",
    "First coverage attempt failed and was retained as attempt-1-unit.json; final coverage passed",
  ],
};
fs.writeFileSync(
  evidence + "/validation-summary.json",
  JSON.stringify(summary, null, 2) + "\n",
);
const targets = [
  "apps/api/src",
  "apps/api/test",
  "apps/web-admin/src",
  "scripts/contracts",
  "scripts/quality",
]
  .flatMap(files)
  .concat([
    "apps/api/tsconfig.json",
    "apps/api/tsconfig.build.json",
    "apps/api/package.json",
    "apps/web-admin/tsconfig.json",
    "apps/web-admin/package.json",
    "package.json",
    "package-lock.json",
    ".github/workflows/ci.yml",
    "scripts/observability/database-regression.cjs",
    "scripts/security/web-data.test.cjs",
  ]);
const hashes = targets
  .filter((p) => /\.(ts|tsx|js|cjs|json|yml|snap)$/.test(p))
  .sort()
  .map((p) => ({
    file: p.replaceAll("\\", "/"),
    sha256: crypto
      .createHash("sha256")
      .update(fs.readFileSync(p))
      .digest("hex"),
  }));
fs.writeFileSync(
  evidence + "/source-file-hashes.json",
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      scope: "Final source/config/test snapshot; not a preservation assertion",
      files: hashes,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    {
      status: summary.status,
      unit: summary.tests.unit,
      coverage: total,
      worker,
      explicitAny: anys.length,
      sourceHashes: hashes.length,
      checks: checks.map((c) => ({ name: c.name, exitCode: c.exitCode })),
    },
    null,
    2,
  ),
);
