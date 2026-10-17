// Only the disposable stack created for Phase 3C. No database reset or volume deletion.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { once } = require("node:events");
const { PrismaClient } = require("../../apps/api/node_modules/@prisma/client");
const root = path.resolve(__dirname, "../..");
const project = "atlas-phase3c-review";
const api = "http://127.0.0.1:4401/api";
const database =
  "postgresql://atlas_test:atlas_test@127.0.0.1:55432/atlas_test?schema=public";
const runtime =
  "postgresql://atlas_app:phase3c-test-runtime-password-not-production@127.0.0.1:55432/atlas_test?schema=public";
const report = {
  scope: "fresh local synthetic stack only",
  steps: [],
  node: process.version,
};
let child;
let brokerStopped = false;
const prisma = new PrismaClient({ datasources: { db: { url: database } } });
const folder = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-recovery-"));
const log = fs.openSync(path.join(folder, "api.log"), "a");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function docker(args) {
  const result = spawnSync("docker", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    timeout: 60000,
  });
  if (result.status !== 0)
    throw new Error(`Fixture Docker command failed: ${args[0]}`);
  return result.stdout;
}
function broker(action) {
  docker([
    "compose",
    "-p",
    project,
    "-f",
    "docker-compose.test.yml",
    action,
    "rabbitmq",
  ]);
}
async function poll(fn, timeout = 90000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try {
      if (await fn()) return;
    } catch (error) {
      last = error;
    }
    await pause(500);
  }
  throw last || new Error("Recovery timed out");
}
async function stopApi() {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGKILL"); // Deliberate crash of this harness-owned process only.
  await exited;
}
async function startApi() {
  child = spawn(process.execPath, [path.join(root, "apps/api/dist/main.js")], {
    cwd: folder,
    windowsHide: true,
    stdio: ["ignore", log, log],
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: "4401",
      DATABASE_URL: runtime,
      REDIS_URL: "redis://127.0.0.1:56379",
      RABBITMQ_URL: "amqp://guest:guest@127.0.0.1:55672",
      QUEUE_NAME: "phase3c_recovery_exports",
      JWT_SECRET: "phase3c-recovery-access-secret-not-production",
      JWT_REFRESH_SECRET: "phase3c-recovery-refresh-secret-not-production",
      STORAGE_ENCRYPTION_KEY: "2".repeat(64),
      STORAGE_RETENTION_ENABLED: "false",
      STORAGE_RETENTION_DRY_RUN: "true",
    },
  });
  await poll(async () => {
    const response = await fetch(`${api}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return false;
    const health = await response.json();
    assert.equal(health.environment, "test");
    assert.equal(health.testDatabase, "atlas_test");
    return true;
  }, 30000);
}
function record(name) {
  report.steps.push({ name, status: "passed" });
  console.log(`PASS ${name}`);
}
(async () => {
  // Verify container identities and volatile DB before any service-control command.
  for (const service of ["postgres", "redis", "rabbitmq"]) {
    const [container] = JSON.parse(
      docker(["inspect", `${project}-${service}-1`]),
    );
    assert.equal(
      container.Config.Labels["com.docker.compose.project"],
      project,
    );
    if (service === "postgres")
      assert.ok(
        Object.hasOwn(container.HostConfig.Tmpfs, "/var/lib/postgresql/data"),
      );
  }
  await assert.rejects(
    fetch(`${api}/health`, { signal: AbortSignal.timeout(1000) }),
    "Port 4401 must be unused",
  );
  await startApi();
  const credentials = {
    email: `recovery-${randomUUID()}@example.test`,
    password: "Synthetic-recovery-password-428!",
  };
  let token;
  let tenantId;
  const request = async (route, method = "GET", body) => {
    const response = await fetch(`${api}${route}`, {
      method,
      signal: AbortSignal.timeout(15000),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(tenantId ? { "x-tenant-id": tenantId } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    assert.ok(response.ok, `${method} ${route}: ${response.status}`);
    return response.json();
  };
  await request("/auth/register", "POST", credentials);
  const login = await request("/auth/login", "POST", credentials);
  token = login.access_token;
  const userId = login.user.id;
  tenantId = (await request("/tenants", "POST", { name: "Recovery fixture" }))
    .id;
  brokerStopped = true;
  broker("stop");
  const date = new Date().toISOString().slice(0, 10);
  const created = await request("/export/logs", "POST", {
    startDate: date,
    endDate: date,
  });
  const jobId = created.data.jobId;
  assert.equal(
    (await prisma.exportTask.findUniqueOrThrow({ where: { id: jobId } }))
      .status,
    "Pending",
  );
  record("Broker outage retains committed Pending export");
  broker("start");
  brokerStopped = false;
  await poll(
    async () =>
      (await request(`/export/status/${jobId}`)).data.status === "Completed",
  );
  record("Broker reconnect and outbox deliver the pending export");
  await stopApi();
  const recoveredId = randomUUID();
  await prisma.exportTask.create({
    data: {
      id: recoveredId,
      tenantId,
      userId,
      status: "Processing",
      leaseToken: randomUUID(),
      leaseUntil: new Date(0),
      expiresAt: new Date(Date.now() + 3600000),
      payload: {
        jobId: recoveredId,
        tenantId,
        userId,
        startDate: date,
        endDate: date,
        status: "Processing",
        progress: 0,
        createdAt: new Date().toISOString(),
      },
    },
  });
  await startApi();
  await poll(
    async () =>
      (await request(`/export/status/${recoveredId}`)).data.status ===
      "Completed",
  );
  const completed = await prisma.exportTask.findUniqueOrThrow({
    where: { id: recoveredId },
  });
  assert.equal(completed.leaseToken, null);
  const download = await fetch(`${api}/export/download/${recoveredId}`, {
    headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(download.status, 200);
  assert.equal(
    Buffer.from(await download.arrayBuffer())
      .subarray(0, 2)
      .toString(),
    "PK",
  );
  record(
    "Fresh worker reclaims expired Processing lease and serves a decryptable ZIP",
  );
})()
  .catch((error) => {
    report.error = error.message;
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (brokerStopped) broker("start");
    } catch {
      report.cleanupError = "Restart fixture broker manually";
      process.exitCode = 1;
    }
    await stopApi();
    await prisma.$disconnect();
    fs.closeSync(log);
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(
      path.join(
        root,
        "docs/improvements/phase-3/evidence/phase-3c/recovery-drill.json",
      ),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
  });
