const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const { createHash } = require("node:crypto");
const root = path.resolve(__dirname, "../..");
const phase = process.env.ATLAS_QUALITY_PHASE || "phase-4c";
if (!["phase-4c", "phase-4d"].includes(phase))
  throw Error("Unsupported quality phase");
const evidence = path.join(root, "docs/improvements/phase-4/evidence", phase);
const api = path.join(root, "apps/api");
const web = path.join(root, "apps/web-admin");
const bin = (pkg, relative, cwd) =>
  path.join(
    path.dirname(require.resolve(pkg + "/package.json", { paths: [cwd] })),
    relative,
  );
const checks = {
  "types-api": {
    cwd: api,
    args: [
      bin("typescript", "bin/tsc", api),
      "--noEmit",
      "--incremental",
      "false",
    ],
  },
  "types-web": {
    cwd: web,
    args: [
      bin("typescript", "bin/tsc", web),
      "--noEmit",
      "--incremental",
      "false",
    ],
  },
  "lint-api": {
    cwd: api,
    args: [bin("eslint", "bin/eslint.js", api), "{src,apps,libs,test}/**/*.ts"],
  },
  "lint-web": { cwd: web, args: [bin("eslint", "bin/eslint.js", web), "."] },
  unit: {
    cwd: api,
    args: [
      bin("jest", "bin/jest.js", api),
      "--runInBand",
      "--coverage",
      "--json",
      "--outputFile=" + path.join(evidence, "unit-results.json"),
    ],
  },
  "build-api": {
    cwd: api,
    args: [bin("@nestjs/cli", "bin/nest.js", api), "build"],
  },
  "build-web": { cwd: web, args: [bin("next", "dist/bin/next", web), "build"] },
  "web-contracts": {
    cwd: root,
    args: ["--test", "scripts/contracts/*.test.cjs"],
  },
  maintenance: {
    cwd: root,
    args: [
      "--test",
      "scripts/maintenance/*.test.cjs",
      "scripts/security/dependency-policy.test.cjs",
    ],
  },
  "security-node": {
    cwd: root,
    args: ["--test", "scripts/security/*.test.cjs"],
  },
};
const name = process.argv[2];
if (!Object.hasOwn(checks, name))
  throw Error("Choose a supported Phase 4C check");
fs.mkdirSync(evidence, { recursive: true });
const check = checks[name];
const startedAt = new Date().toISOString();
const result = cp.spawnSync(process.execPath, check.args, {
  cwd: check.cwd,
  encoding: "utf8",
  windowsHide: true,
  timeout: 600000,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  maxBuffer: 16 * 1024 * 1024,
});
const log = (result.stdout || "") + "\n" + (result.stderr || "");
const logName = "check-" + name + ".log";
fs.writeFileSync(path.join(evidence, logName), log);
const report = {
  name,
  startedAt,
  finishedAt: new Date().toISOString(),
  exitCode: result.status,
  command: [process.execPath, ...check.args]
    .map((arg) => arg.replace(root, "<repo>"))
    .join(" "),
  cwd: path.relative(root, check.cwd) || ".",
  log: logName,
  logSha256: createHash("sha256").update(log).digest("hex"),
  ...(result.error ? { error: result.error.message } : {}),
};
fs.writeFileSync(
  path.join(evidence, "check-" + name + ".json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
if (result.status !== 0) console.error(log.slice(-12000));
process.exitCode = result.status === 0 ? 0 : 1;
