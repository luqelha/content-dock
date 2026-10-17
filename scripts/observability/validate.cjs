const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "../..");
process.chdir(root);
const evidence = path.join(root, "docs/improvements/phase-4/evidence/phase-4a");
fs.mkdirSync(evidence, { recursive: true });
const operation = process.argv[2];
const npm = (args) =>
  process.platform === "win32"
    ? ["cmd.exe", ["/d", "/s", "/c", `npm.cmd ${args}`]]
    : ["npm", args.split(" ")];
const directory = path.join(root, "ops/observability");
const mount = `${directory.replaceAll("\\", "/")}:/etc/atlas:ro`;
const commands = {
  types: npm("exec --workspace=@atlas/api -- tsc --noEmit"),
  lint: npm("run lint --workspace=@atlas/api"),
  unit: npm("run test:cov --workspace=@atlas/api -- --runInBand"),
  security: npm("run test:security"),
  journal: [
    process.execPath,
    ["--test", "scripts/observability/alert-journal.test.cjs"],
  ],
  observability: npm("run test:observability"),
  audit: npm("audit --omit=dev --audit-level=moderate"),
  build: npm("run build --workspace=@atlas/api"),
  rules: [
    "docker",
    [
      "run",
      "--name",
      `atlas-phase4a-rules-${Date.now()}`,
      "--network",
      "none",
      "--entrypoint",
      "/bin/promtool",
      "-v",
      mount,
      "-w",
      "/etc/atlas",
      "prom/prometheus:v3.15.0",
      "test",
      "rules",
      "alerts.test.json",
    ],
  ],
  prometheus: [
    "docker",
    [
      "run",
      "--name",
      `atlas-phase4a-promcfg-${Date.now()}`,
      "--network",
      "none",
      "--entrypoint",
      "/bin/promtool",
      "-v",
      mount,
      "prom/prometheus:v3.15.0",
      "check",
      "config",
      "--syntax-only",
      "/etc/atlas/prometheus.yml",
    ],
  ],
  alertmanager: [
    "docker",
    [
      "run",
      "--name",
      `atlas-phase4a-amcfg-${Date.now()}`,
      "--network",
      "none",
      "--entrypoint",
      "/bin/amtool",
      "-v",
      mount,
      "prom/alertmanager:v0.34.1",
      "check-config",
      "/etc/atlas/alertmanager.yml",
    ],
  ],
  imageApi: [
    "docker",
    ["build", "-f", "apps/api/Dockerfile", "-t", "atlas-api:phase4a", "."],
  ],
  imageJournal: [
    "docker",
    [
      "build",
      "-f",
      "ops/observability/alert-journal.Dockerfile",
      "-t",
      "atlas-alert-journal:phase4a",
      ".",
    ],
  ],
};
if (!commands[operation]) throw Error(`Unknown validation: ${operation}`);
const [file, args] = commands[operation];
const startedAt = new Date().toISOString();
const result = cp.spawnSync(file, args, {
  cwd: root,
  encoding: "utf8",
  windowsHide: true,
  timeout: operation.startsWith("image") ? 600000 : 240000,
  maxBuffer: 32 * 1024 * 1024,
});
const basename = `check-${operation}-${Date.now()}`;
const log = `${result.stdout || ""}\n${result.stderr || ""}`;
fs.writeFileSync(path.join(evidence, basename + ".log"), log);
const record = {
  operation,
  startedAt,
  finishedAt: new Date().toISOString(),
  command: [file, ...args],
  exitCode: result.status,
  errorCode: result.error?.code,
  log: basename + ".log",
  logSha256: crypto.createHash("sha256").update(log).digest("hex"),
  scope: "Working tree validation, not staging or production",
};
fs.writeFileSync(
  path.join(evidence, basename + ".json"),
  JSON.stringify(record, null, 2) + "\n",
);
console.log(JSON.stringify(record, null, 2));
process.exitCode = result.status === 0 ? 0 : 1;
