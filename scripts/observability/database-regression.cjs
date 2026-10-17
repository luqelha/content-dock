const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const net = require("node:net");
const { randomBytes, createHash } = require("node:crypto");
const root = path.resolve(__dirname, "../..");
process.chdir(root);
const phase = process.env.ATLAS_REGRESSION_PHASE || "phase-4a";
if (!["phase-4a", "phase-4c", "phase-4d"].includes(phase))
  throw Error("Unsupported regression phase");
const evidence = path.join(root, "docs/improvements/phase-4/evidence", phase);
fs.mkdirSync(evidence, { recursive: true });
const project =
  "atlas-" +
  phase.replace("-", "") +
  "-regression-" +
  randomBytes(4).toString("hex");
const basename = "database-regression-" + Date.now();
const report = {
  startedAt: new Date().toISOString(),
  project,
  scope: "New local tmpfs database and isolated E2E vaults only",
  checks: [],
  status: "running",
};
const keepAlive = setInterval(() => {}, 1000);
const env = {
  ...process.env,
  NODE_ENV: "test",
  OBSERVABILITY_ENABLED: "false",
  DATABASE_URL:
    "postgresql://atlas_test:atlas_test@127.0.0.1:55432/atlas_test?schema=public",
  REDIS_URL: "redis://127.0.0.1:56379",
  RABBITMQ_URL: "amqp://guest:guest@127.0.0.1:55672",
  JWT_SECRET: "phase4a-test-access-secret-not-production",
  JWT_REFRESH_SECRET: "phase4a-test-refresh-secret-not-production",
  AUTH_PROXY_SECRET: "phase4a-test-proxy-secret-not-production",
  STORAGE_ENCRYPTION_KEY: "4".repeat(64),
  STORAGE_RETENTION_ENABLED: "false",
  STORAGE_RETENTION_DRY_RUN: "true",
};
let created = false;
const docker = (args, input) => {
  const r = cp.spawnSync("docker", args, {
    cwd: root,
    encoding: "utf8",
    timeout: 60000,
    windowsHide: true,
    input,
  });
  if (r.status !== 0) throw Error("Fixture Docker " + args[0] + " failed");
  return r.stdout;
};
const compose = (args) =>
  docker(["compose", "-p", project, "-f", "docker-compose.test.yml", ...args]);
const save = () =>
  fs.writeFileSync(
    path.join(evidence, basename + ".json"),
    JSON.stringify(report, null, 2) + "\n",
  );
function verifyFixture() {
  for (const c of report.containers) {
    const actual = JSON.parse(docker(["inspect", c.id]))[0];
    if (
      actual.Id !== c.id ||
      actual.Config.Labels["com.docker.compose.project"] !== project ||
      !actual.State.Running
    )
      throw Error("Regression fixture identity mismatch");
  }
}
function run(name, file, args) {
  verifyFixture();
  const startedAt = new Date().toISOString();
  const r = cp.spawnSync(file, args, {
    cwd: root,
    env,
    encoding: "utf8",
    timeout: phase === "phase-4d" ? 1500000 : 240000,
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  const log = (r.stdout || "") + "\n" + (r.stderr || "");
  const logFile = basename + "-" + name + ".log";
  fs.writeFileSync(path.join(evidence, logFile), log);
  report.checks.push({
    name,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: r.status,
    log: logFile,
    logSha256: createHash("sha256").update(log).digest("hex"),
  });
  save();
  if (r.status !== 0)
    throw Error("Regression " + name + " failed; see private log");
}
async function runBrowser() {
  verifyFixture();
  const startedAt = new Date().toISOString();
  const logFile = basename + "-browser.log";
  const chunks = [];
  let pending = "";
  report.retentionRowsPreserved = true;
  save();
  const code = await new Promise((resolve, reject) => {
    const child = cp.spawn(
      process.execPath,
      [
        require.resolve("@playwright/test/cli"),
        "test",
        ...process.argv.slice(2),
      ],
      {
        cwd: root,
        env,
        windowsHide: true,
        timeout: 1500000,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    for (const stream of [child.stdout, child.stderr])
      stream.on("data", (chunk) => {
        chunks.push(chunk);
        pending += chunk.toString("utf8");
        const lines = pending.split(/\r?\n/);
        pending = lines.pop();
        // Expose static test progress, not API logs, headers or fixture tokens.
        for (const line of lines) {
          const plain = line.replace(/\u001b\[[0-9;]*m/g, "");
          if (/^\s*[✓✘]\s+\d+\s+\[(chromium|firefox|webkit)\]/.test(plain))
            console.log(plain.trim());
        }
      });
    child.once("error", reject);
    child.once("close", resolve);
  });
  const log = Buffer.concat(chunks);
  fs.writeFileSync(path.join(evidence, logFile), log);
  report.checks.push({
    name: "browser",
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: code,
    log: logFile,
    logSha256: createHash("sha256").update(log).digest("hex"),
  });
  save();
  if (code !== 0) throw Error("Regression browser failed; see private log");
}
async function main() {
  if (process.env.DOCKER_HOST || process.env.DOCKER_CONTEXT)
    throw Error("Docker overrides refused");
  const context = docker(["context", "show"]).trim();
  const d = JSON.parse(docker(["context", "inspect", context]))[0];
  if (!/^(npipe:|unix:)/.test(d.Endpoints.docker.Host))
    throw Error("Local Docker required");
  if (
    docker([
      "ps",
      "-aq",
      "--filter",
      "label=com.docker.compose.project=" + project,
    ]).trim()
  )
    throw Error("Project already exists");
  for (const port of [
    55432,
    56379,
    55672,
    ...(phase === "phase-4d" ? [3300, 3443, 4400] : []),
  ])
    await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once("error", reject);
      server.listen(port, "127.0.0.1", () => server.close(resolve));
    });
  created = true;
  compose(["up", "-d", "--wait"]);
  report.containers = ["postgres", "redis", "rabbitmq"].map((service) => {
    const c = JSON.parse(docker(["inspect", `${project}-${service}-1`]))[0];
    if (c.Config.Labels["com.docker.compose.project"] !== project)
      throw Error("Ownership mismatch");
    if (
      service === "postgres" &&
      !Object.hasOwn(c.HostConfig.Tmpfs || {}, "/var/lib/postgresql/data")
    )
      throw Error("New tmpfs DB required");
    for (const ports of Object.values(c.NetworkSettings.Ports))
      for (const binding of ports || [])
        if (binding.HostIp !== "127.0.0.1") throw Error("Loopback required");
    return { service, id: c.Id, image: c.Image };
  });
  const empty = docker([
    "exec",
    report.containers[0].id,
    "psql",
    "-X",
    "-U",
    "atlas_test",
    "-d",
    "atlas_test",
    "-At",
    "-c",
    "SELECT count(*) FROM pg_tables WHERE schemaname='public';",
  ]);
  if (empty.trim() !== "0")
    throw Error("Database must be empty before migrations");
  save();
  const prisma = require.resolve("prisma/build/index.js", {
    paths: [path.join(root, "apps/api")],
  });
  run("migrate", process.execPath, [
    prisma,
    "migrate",
    "deploy",
    "--schema",
    path.join(root, "apps/api/prisma/schema.prisma"),
  ]);
  if (phase === "phase-4d") {
    const database = report.containers[0].id;
    const psql = [
      "exec",
      "-i",
      database,
      "psql",
      "-X",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "atlas_test",
      "-d",
      "atlas_test",
    ];
    docker(
      psql,
      fs.readFileSync(
        path.join(root, "scripts/maintenance/retention-fixture.sql"),
        "utf8",
      ),
    );
    const inventory = JSON.parse(
      docker(
        psql,
        fs.readFileSync(
          path.join(root, "scripts/database/retention-inventory.sql"),
          "utf8",
        ),
      ).trim(),
    );
    if (
      inventory.readOnly !== "on" ||
      inventory.exportMetadata.total !== 6 ||
      inventory.exportMetadata.terminalExpiredOver30Days !== 2 ||
      inventory.exportMetadata.nonterminalExpiredOver30Days !== 1 ||
      inventory.exportMetadata.activeLease !== 1
    )
      throw Error("Retention inventory classification regression");
    if (docker(psql, 'SELECT count(*) FROM "ExportTask";').trim() !== "6")
      throw Error("Read-only inventory changed fixture rows");
    fs.writeFileSync(
      path.join(evidence, basename + "-retention.json"),
      JSON.stringify(inventory, null, 2) + "\n",
    );
    report.retentionInventory = basename + "-retention.json";
    const password = "phase4d-fixture-runtime-password-not-production";
    docker(
      [
        "exec",
        "-i",
        "-e",
        "ATLAS_APP_PASSWORD=" + password,
        database,
        "psql",
        "-X",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "atlas_test",
        "-d",
        "atlas_test",
      ],
      fs.readFileSync(
        path.join(root, "scripts/database/create-runtime-role.sql"),
        "utf8",
      ),
    );
    env.DATABASE_APP_URL = `postgresql://atlas_app:${password}@127.0.0.1:55432/atlas_test?schema=public`;
    env.CI = "true";
    env.ATLAS_BROWSER_NO_RETRIES = "1";
    env.NEXT_TELEMETRY_DISABLED = "1";
    await runBrowser();
    report.status = "passed";
    return;
  }
  const jest = require.resolve("jest/bin/jest", {
    paths: [path.join(root, "apps/api")],
  });
  run("integration", process.execPath, [
    jest,
    "--config",
    path.join(root, "apps/api/test/jest-int.json"),
    "--runInBand",
  ]);
  const config = JSON.parse(
    fs.readFileSync(path.join(root, "apps/api/test/jest-e2e.json"), "utf8"),
  );
  config.rootDir = path.join(root, "apps/api/test");
  config.setupFiles = [path.join(__dirname, "isolate-test-vault.cjs")];
  config.transform["^.+\\.(t|j)s$"] = [
    "ts-jest",
    { tsconfig: path.join(root, "apps/api/tsconfig.json") },
  ];
  run("e2e", process.execPath, [
    jest,
    "--config",
    JSON.stringify(config),
    "--runInBand",
  ]);
  report.status = "passed";
}
main()
  .catch((error) => {
    report.status = "failed";
    report.error = error.message;
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      if (created) compose(["stop", "--timeout", "15"]);
    } catch (error) {
      report.cleanupError = error.message;
      report.status = "failed";
      process.exitCode = 1;
    }
    report.finishedAt = new Date().toISOString();
    report.volumesRetained = true;
    save();
    clearInterval(keepAlive);
    console.log(
      JSON.stringify(
        {
          status: report.status,
          checks: report.checks,
          report: basename + ".json",
          error: report.error,
        },
        null,
        2,
      ),
    );
  });
