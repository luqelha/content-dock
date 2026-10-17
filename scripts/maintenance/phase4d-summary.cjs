const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const root = path.resolve(__dirname, "../..");
process.chdir(root);
const folder = "docs/improvements/phase-4/evidence/phase-4d";
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const hash = (file) =>
  createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const browser = read(folder + "/final-browser-summary.json");
const fixture = fs
  .readdirSync(folder)
  .filter((f) => /^database-regression-\d+\.json$/.test(f))
  .map((f) => ({ file: f, ...read(folder + "/" + f) }))
  .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
const checks = fs
  .readdirSync(folder)
  .filter((f) => /^check-.+\.json$/.test(f))
  .map((f) => {
    const check = read(folder + "/" + f);
    if (
      check.exitCode !== 0 ||
      hash(folder + "/" + check.log) !== check.logSha256
    )
      throw Error("Failed or mismatched check: " + check.name);
    return check;
  });
for (const name of [
  "types-api",
  "types-web",
  "lint-web",
  "unit",
  "web-contracts",
  "security-node",
  "maintenance",
  "build-web",
])
  if (!checks.some((check) => check.name === name))
    throw Error("Missing check: " + name);
const audit = read("artifacts/dependency-audit/review.json");
const lifecycle = read("artifacts/maintenance/dependency-lifecycle.json");
const runtime = read(folder + "/runtime-audit.json");
if (
  fixture.status !== "passed" ||
  browser.stats.unexpected ||
  browser.stats.skipped ||
  browser.stats.flaky ||
  browser.stats.expected !== 33 ||
  runtime.metadata.vulnerabilities.total !== 0 ||
  audit.failures.length ||
  lifecycle.failures.length ||
  audit.lockSha256 !== hash("package-lock.json") ||
  lifecycle.lockSha256 !== hash("package-lock.json")
)
  throw Error("Final Phase 4D evidence gate not satisfied");
for (const [from, to] of [
  ["artifacts/dependency-audit/audit.json", "full-audit.json"],
  ["artifacts/dependency-audit/review.json", "dependency-review.json"],
  [
    "artifacts/maintenance/dependency-lifecycle.json",
    "dependency-lifecycle.json",
  ],
])
  fs.copyFileSync(from, folder + "/" + to);
const units = read(folder + "/unit-results.json");
const scans = browser.tests.flatMap((t) => t.scans);
if (
  !units.success ||
  scans.length !== 51 ||
  scans.some((scan) => scan.violations.length)
)
  throw Error("Unit/accessibility evidence not complete or passing");
const report = {
  generatedAt: new Date().toISOString(),
  status: "local-engineering-checks-passed-external-gates-open",
  environment: {
    platform: process.platform,
    node: process.versions.node,
    playwright: require("@playwright/test/package.json").version,
    axePlaywright: read("node_modules/@axe-core/playwright/package.json")
      .version,
    configuredNpm: require("../../package.json").packageManager,
  },
  checks,
  unit: {
    passed: units.numPassedTests,
    total: units.numTotalTests,
    suites: units.numPassedTestSuites,
    success: units.success,
  },
  browser: {
    ...browser.stats,
    projects: [...new Set(browser.tests.map((t) => t.project))],
    scans: scans.length,
    violationRules: scans.reduce((n, s) => n + s.violations.length, 0),
    incompleteRuleOccurrences: scans.reduce(
      (n, s) => n + s.incomplete.length,
      0,
    ),
    fixture: fixture.file,
    retention: fixture.retentionInventory,
  },
  dependencies: {
    full: audit.counts,
    runtime: runtime.metadata.vulnerabilities,
    policyFailures: audit.failures,
    lifecycleFailures: lifecycle.failures,
    nextReviewBy: lifecycle.policy.reviewBy,
    lockSha256: hash("package-lock.json"),
  },
  externalGates: [
    "Remote GitHub CI/scheduled workflow/Dependabot execution",
    "NVDA/VoiceOver and physical mobile/Safari verification",
    "Data-owner retention approval, legal holds and off-host restore proof before destructive activation",
    "Upstream advisory remediation and staged dependency major migrations",
  ],
  sourceHashes: {},
};
const files = [
  "README.md",
  "docs/improvements/phase-4/PHASE-4D-REPORT.md",
  "docs/improvements/phase-4/LONG-TERM-MAINTENANCE.md",
  "docs/improvements/phase-4/RETENTION-POLICY.md",
  "docs/improvements/phase-4/BROWSER-ACCESSIBILITY.md",
  "docs/improvements/phase-4/ACCESSIBILITY-REVIEW.md",
  "docs/improvements/phase-4/evidence/phase-4d/README.md",
  "apps/web-admin/src/components/ui/form.tsx",
  "apps/web-admin/src/components/ui/sidebar.tsx",
  "apps/web-admin/src/components/theme-provider.tsx",
  "scripts/security/dependency-policy.cjs",
  "package.json",
  "package-lock.json",
  "playwright.config.ts",
  ".node-version",
  ".github/workflows/ci.yml",
  ".github/workflows/maintenance.yml",
  ".github/dependabot.yml",
  "ops/maintenance/dependency-lifecycle.json",
  "scripts/database/retention-inventory.sql",
  "scripts/security/dependency-audit.cjs",
  "scripts/observability/database-regression.cjs",
  "scripts/quality/phase4c-check.cjs",
  ...fs
    .readdirSync("scripts/maintenance")
    .filter((f) => f.endsWith(".cjs"))
    .map((f) => "scripts/maintenance/" + f),
  "tests/browser/accessibility.ts",
  "tests/browser/accessibility.spec.ts",
  "tests/browser/security-flows.spec.ts",
  "apps/web-admin/src/components/ui/password-input.tsx",
  "apps/web-admin/src/components/auth-feedback.tsx",
  "apps/web-admin/src/app/globals.css",
  "apps/web-admin/src/app/(auth)/login/page.tsx",
  "apps/web-admin/src/app/dashboard/layout.tsx",
  "apps/web-admin/src/components/dashboard/categories/category-modal.tsx",
  "apps/web-admin/src/components/dashboard/media/media-dropzone.tsx",
  "apps/web-admin/src/components/dashboard/media/media-upload-modal.tsx",
  "apps/web-admin/src/components/dashboard/media/media-preview-modal.tsx",
  "apps/web-admin/src/components/dashboard/media/media-delete-modal.tsx",
  "apps/web-admin/src/components/ui/image-picker-modal.tsx",
  "apps/web-admin/src/components/dashboard/content/content-form.tsx",
  "apps/web-admin/src/components/dashboard/exports-client.tsx",
];
for (const file of files) report.sourceHashes[file] = hash(file);
fs.writeFileSync(
  folder + "/validation-summary.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      status: report.status,
      browser: report.browser,
      dependencies: report.dependencies,
    },
    null,
    2,
  ),
);
