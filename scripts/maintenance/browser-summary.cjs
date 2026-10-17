const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const name = process.argv[2];
if (!/^(attempt-[1-9][0-9]*|final)-browser-summary$/.test(name || ""))
  throw Error("Use attempt-N-browser-summary or final-browser-summary");
const raw = fs.readFileSync("test-results/browser-results.json", "utf8");
const report = JSON.parse(raw);
const tests = [];
function walk(suite) {
  for (const child of suite.suites || []) walk(child);
  for (const spec of suite.specs || []) {
    for (const test of spec.tests) {
      tests.push({
        title: spec.title,
        project: test.projectName,
        status: test.status,
        attempts: test.results.length,
        errors: test.results.flatMap((result) =>
          result.errors.map((error) =>
            error.message?.replace(/\u001b\[[0-9;]*m/g, "").slice(0, 1200),
          ),
        ),
        scans: test.results.flatMap((result) =>
          result.attachments
            .filter((a) => a.name.startsWith("axe-"))
            .map((attachment) => {
              const content = attachment.body
                ? Buffer.from(attachment.body, "base64").toString("utf8")
                : fs.readFileSync(attachment.path, "utf8");
              const scan = JSON.parse(content);
              return {
                state: attachment.name,
                violations: scan.violations.map((v) => ({
                  id: v.id,
                  impact: v.impact,
                  nodes: v.nodes.map((n) => ({
                    target: n.target,
                    summary: n.failureSummary,
                  })),
                })),
                incomplete: scan.incomplete.map((v) => ({
                  id: v.id,
                  impact: v.impact,
                  nodes: v.nodes.length,
                  details: v.nodes.map((node) => ({
                    target: node.target,
                    checks: [...node.any, ...node.all, ...node.none].map(
                      (check) => ({ id: check.id, message: check.message }),
                    ),
                  })),
                })),
              };
            }),
        ),
      });
    }
  }
}
walk(report);
const summary = {
  generatedAt: new Date().toISOString(),
  reportSha256: createHash("sha256").update(raw).digest("hex"),
  stats: report.stats,
  errors: report.errors,
  tests,
};
const output = path.join(
  "docs/improvements/phase-4/evidence/phase-4d",
  name + ".json",
);
fs.writeFileSync(output, JSON.stringify(summary, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      output,
      stats: report.stats,
      failures: tests
        .filter((t) => t.status !== "expected")
        .map(({ scans, ...test }) => test),
    },
    null,
    2,
  ),
);
