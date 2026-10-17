const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../../../../..");
const name = process.argv[2];
const outputName = process.argv[3] === "--resume" ? `${name}-resume` : name;
const operations = {
  imageApi: [
    "docker",
    [
      "build",
      "-f",
      "apps/api/Dockerfile",
      "-t",
      "atlas-api:phase3e-verify",
      ".",
    ],
  ],
  imageWeb: [
    "docker",
    [
      "build",
      "-f",
      "apps/web-admin/Dockerfile",
      "-t",
      "atlas-web:phase3e-verify",
      ".",
    ],
  ],
  proxy: [process.execPath, ["scripts/security/proxy-smoke.cjs"]],
  recovery: [process.execPath, [path.join(__dirname, "recovery.cjs")]],
  restore: [
    process.execPath,
    [path.join(__dirname, "restore.cjs"), "--approved-isolated-local"],
  ],
};
if (!operations[name]) throw new Error("Unknown operation");
if (process.env.DOCKER_HOST) throw new Error("Docker override refused");
const context = JSON.parse(
  spawnSync("docker", ["context", "inspect"], {
    encoding: "utf8",
    windowsHide: true,
  }).stdout,
)[0];
if (!/^(npipe|unix):/.test(context.Endpoints.docker.Host))
  throw new Error("Local Docker required");
const [command, args] = operations[name];
const started = Date.now();
const result = spawnSync(command, args, {
  cwd: root,
  windowsHide: true,
  encoding: "utf8",
  timeout: 1200000,
  maxBuffer: 30 * 1024 * 1024,
});
fs.writeFileSync(
  path.join(__dirname, `${outputName}.log`),
  (result.stdout || "") + (result.stderr || ""),
);
const summary = {
  name,
  command: [command, ...args],
  exitCode: result.status,
  error: result.error?.message,
  durationMs: Date.now() - started,
  finishedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(__dirname, `${outputName}.json`),
  JSON.stringify(summary, null, 2),
);
console.log(JSON.stringify(summary));
if (result.status !== 0)
  console.log(((result.stdout || "") + (result.stderr || "")).slice(-4000));
process.exitCode = result.status ?? 1;
