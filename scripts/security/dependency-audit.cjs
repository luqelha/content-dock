const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { reviewAudit } = require("./dependency-policy.cjs");

// npm exposes its exact CLI when invoked with npm run; no shell interpolation.
const cli = process.env.npm_execpath;
if (!cli) throw new Error("Run through npm run audit:dependencies.");
const result = spawnSync(process.execPath, [cli, "audit", "--json"], {
  encoding: "utf8",
  timeout: 120000,
  maxBuffer: 10 * 1024 * 1024,
});
if (result.error || ![0, 1].includes(result.status))
  throw new Error("npm audit could not complete");
const report = JSON.parse(result.stdout);
const folder = path.resolve("artifacts/dependency-audit");
fs.mkdirSync(folder, { recursive: true });
fs.writeFileSync(
  path.join(folder, "audit.json"),
  JSON.stringify(report, null, 2),
);
const failures = reviewAudit(
  report,
  JSON.parse(fs.readFileSync("package-lock.json", "utf8")),
);
console.log(
  JSON.stringify(
    { counts: report.metadata.vulnerabilities, failures },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
