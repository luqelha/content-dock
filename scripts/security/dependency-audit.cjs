const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { reviewAudit } = require("./dependency-policy.cjs");

// npm exposes its exact CLI when invoked with npm run; no shell interpolation.
const cli = process.env.npm_execpath;
if (!cli) throw new Error("Run through npm run audit:dependencies.");
const folder = path.resolve("artifacts/dependency-audit");
fs.mkdirSync(folder, { recursive: true });
const summary = {
  generatedAt: new Date().toISOString(),
  lockSha256: createHash("sha256")
    .update(fs.readFileSync("package-lock.json"))
    .digest("hex"),
  status: "unavailable",
};
// A failed lookup must not leave an old successful review looking current.
fs.writeFileSync(
  path.join(folder, "review.json"),
  JSON.stringify(summary, null, 2) + "\n",
);
const result = spawnSync(
  process.execPath,
  [
    cli,
    "audit",
    "--json",
    "--package-lock-only",
    "--fetch-retries=0",
    "--fetch-timeout=30000",
  ],
  {
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  },
);
if (result.error || ![0, 1].includes(result.status))
  throw new Error("npm audit could not complete");
const report = JSON.parse(result.stdout);
fs.writeFileSync(
  path.join(folder, "audit.json"),
  JSON.stringify(report, null, 2),
);
const failures = reviewAudit(
  report,
  JSON.parse(fs.readFileSync("package-lock.json", "utf8")),
);
Object.assign(summary, {
  status: failures.length
    ? "failed"
    : report.metadata.vulnerabilities.total
      ? "accepted-with-time-limited-exceptions"
      : "clean",
  counts: report.metadata.vulnerabilities,
  failures,
  advisories: [
    ...new Map(
      Object.values(report.vulnerabilities).flatMap((finding) =>
        finding.via
          .filter((via) => typeof via === "object")
          .map((via) => [
            via.url,
            {
              name: via.name,
              url: via.url,
              severity: via.severity,
              range: via.range,
              nodes: finding.nodes,
            },
          ]),
      ),
    ).values(),
  ],
});
fs.writeFileSync(
  path.join(folder, "review.json"),
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    { counts: report.metadata.vulnerabilities, failures },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
