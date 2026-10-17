// Fresh local synthetic infrastructure only. No external URLs, production data,
// existing project reuse, retention collection, volume removal, or failure endpoints.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const cp = require("node:child_process");
const { randomBytes, randomUUID, createHash } = require("node:crypto");
const root = path.resolve(__dirname, "../..");
process.chdir(root);
if (process.argv[2] !== "--run-isolated")
  throw Error("Use --run-isolated for a fresh disposable local fixture");
if (process.env.DOCKER_HOST || process.env.DOCKER_CONTEXT)
  throw Error("Docker overrides are refused");
const evidence = path.join(root, "docs/improvements/phase-4/evidence/phase-4a");
const project = `atlas-phase4a-${randomBytes(5).toString("hex")}`;
const privateDir = fs.mkdtempSync(path.join(os.tmpdir(), project + "-"));
const secret = () => randomBytes(24).toString("hex");
const secrets = {
  owner: secret(),
  runtime: secret(),
  broker: secret(),
  jwt: secret(),
  refresh: secret(),
  proxy: secret(),
  key: randomBytes(32).toString("hex"),
  grafana: secret(),
};
const database = "atlas_phase4a_test";
const queue = "atlas_phase4a_exports";
const reportFile = path.join(evidence, `drill-${Date.now()}.json`);
const report = {
  startedAt: new Date().toISOString(),
  scope: "New isolated local synthetic stack; not staging or a production SLA",
  project,
  privateConfigDirectory: privateDir,
  checkpoints: [],
  faults: [],
  status: "running",
};
fs.mkdirSync(evidence, { recursive: true });
const hash = (data) => createHash("sha256").update(data).digest("hex");
const redact = (value) =>
  Object.values(secrets).reduce(
    (s, value) => s.replaceAll(value, "[REDACTED]"),
    String(value),
  );
const save = () =>
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n");
function docker(args, { input, timeout = 90000 } = {}) {
  const r = cp.spawnSync("docker", args, {
    cwd: root,
    input,
    encoding: "utf8",
    timeout,
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (r.status !== 0)
    throw Error(
      `Fixture Docker ${args[0]} failed (${r.status}): ${redact(r.stderr || r.error?.code || "").slice(-1500)}`,
    );
  return args[0] === "logs" ? r.stdout + "\n" + r.stderr : r.stdout;
}
const inspect = (id) => JSON.parse(docker(["inspect", id]))[0];
const inventory = () =>
  docker(["ps", "-a", "--no-trunc", "--format", "{{json .}}"])
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const c = JSON.parse(line);
      return { id: c.ID, name: c.Names, image: c.Image, state: c.State };
    });
const configPath = path.join(privateDir, "compose.json");
const compose = (args) =>
  docker(["compose", "-p", project, "-f", configPath, ...args]);
const identities = new Map();
// Keep the harness alive while awaiting HTTP/drivers that may use unref'd handles.
const keepAlive = setInterval(() => {}, 1000);
const endpoints = {};
let created = false;
let token, tenantId, userId;
const published = (target) => [
  { target, published: "0", host_ip: "127.0.0.1", protocol: "tcp" },
];
function own(service) {
  const c = inspect(`${project}-${service}-1`);
  assert.equal(c.Config.Labels["com.docker.compose.project"], project);
  assert.equal(c.Config.Labels["com.docker.compose.service"], service);
  if (identities.has(service)) assert.equal(c.Id, identities.get(service));
  else identities.set(service, c.Id);
  for (const mount of c.Mounts.filter((m) => m.Type === "volume"))
    assert.ok(mount.Name.startsWith(project + "_"));
  for (const bindings of Object.values(c.NetworkSettings.Ports || {}))
    for (const port of bindings || []) assert.equal(port.HostIp, "127.0.0.1");
  for (const network of Object.keys(c.NetworkSettings.Networks))
    assert.ok(network.startsWith(project + "_"));
  return c;
}
function refreshEndpoints() {
  for (const [service, port] of Object.entries({
    api: 4000,
    prometheus: 9090,
    alertmanager: 9093,
    grafana: 3000,
  })) {
    if (service === "grafana" && !identities.has("grafana")) continue;
    const c = own(service);
    assert.ok(
      c.State.Running,
      `${service} must be running before resolving its fixture endpoint`,
    );
    const binding = c.NetworkSettings.Ports[port + "/tcp"]?.[0];
    assert.ok(binding, `${service} loopback port binding is unavailable`);
    endpoints[service] = `http://127.0.0.1:${binding.HostPort}`;
    if (service === "api")
      endpoints.management = `http://127.0.0.1:${c.NetworkSettings.Ports["9091/tcp"][0].HostPort}`;
  }
  fs.writeFileSync(
    path.join(privateDir, "preview.json"),
    JSON.stringify({
      endpoints,
      grafanaUser: "atlas-operator",
      grafanaPassword: secrets.grafana,
    }),
  );
}
async function poll(fn, timeout = 90000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw Error(
    `Fixture deadline exceeded${last ? ": " + redact(last.message).slice(0, 250) : ""}`,
  );
}
async function fetchBounded(url, options = {}) {
  const target = new URL(url);
  assert.equal(target.hostname, "127.0.0.1");
  return fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
}
async function api(route, method = "GET", body) {
  const r = await fetchBounded(endpoints.api + "/api" + route, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.ok(r.ok, `${method} ${route} HTTP ${r.status}`);
  return r.json();
}
async function ready() {
  return (
    (await fetchBounded(endpoints.management + "/health/ready")).status === 200
  );
}
async function metric() {
  const r = await fetchBounded(endpoints.management + "/metrics");
  assert.equal(r.status, 200);
  return r.text();
}
function sql(query, runtime = false) {
  own("postgres");
  return docker(
    [
      "exec",
      "-i",
      identities.get("postgres"),
      "psql",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      runtime ? "atlas_app" : "atlas_owner",
      "-d",
      database,
      "-At",
    ],
    { input: query },
  );
}
async function query(expression) {
  const r = await fetchBounded(
    endpoints.prometheus +
      "/api/v1/query?query=" +
      encodeURIComponent(expression),
  );
  const d = await r.json();
  assert.equal(d.status, "success");
  return d.data.result;
}
async function notification(alertname, status, dependency) {
  const text = docker([
    "exec",
    own("alert-journal").Id,
    "node",
    "-e",
    "fetch('http://127.0.0.1:9099/events').then(r=>r.text()).then(t=>process.stdout.write(t))",
  ]);
  return JSON.parse(text).find(
    (e) =>
      e.labels.alertname === alertname &&
      e.status === status &&
      (!dependency || e.labels.dependency === dependency),
  );
}
async function checkpoint(name, work) {
  console.log(`START ${name}`);
  const startedAt = new Date().toISOString();
  const start = performance.now();
  try {
    const details = await work();
    report.checkpoints.push({
      name,
      status: "passed",
      startedAt,
      elapsedSeconds: (performance.now() - start) / 1000,
      ...(details ? { details } : {}),
    });
    console.log(`PASS ${name}`);
    save();
  } catch (error) {
    report.checkpoints.push({
      name,
      status: "failed",
      startedAt,
      error: redact(error.message),
    });
    save();
    throw error;
  }
}
async function waitJob(id, expected = "Completed") {
  await poll(
    async () => (await api(`/export/status/${id}`)).data.status === expected,
    90000,
  );
}
async function download(id) {
  const r = await fetchBounded(endpoints.api + `/api/export/download/${id}`, {
    headers: { Authorization: "Bearer " + token, "x-tenant-id": tenantId },
  });
  assert.equal(r.status, 200);
  const data = Buffer.from(await r.arrayBuffer());
  assert.equal(data.subarray(0, 2).toString(), "PK");
  return hash(data);
}
const date = new Date().toISOString().slice(0, 10);
async function job() {
  return (await api("/export/logs", "POST", { startDate: date, endDate: date }))
    .data.jobId;
}
function seed(status = "Pending") {
  const id = randomUUID();
  const payload = {
    jobId: id,
    tenantId,
    userId,
    startDate: date,
    endDate: date,
    createdAt: new Date().toISOString(),
    status,
    progress: 0,
  };
  sql(
    `INSERT INTO "ExportTask" (id,"tenantId","userId",status,payload,"expiresAt","leaseUntil","leaseToken") VALUES ('${id}','${tenantId}','${userId}','${status}','${JSON.stringify(payload)}'::jsonb,now()+interval '1 hour',${status === "Processing" ? "now()-interval '11 minutes'" : "NULL"},${status === "Processing" ? "'" + randomUUID() + "'" : "NULL"});`,
  );
  return id;
}
async function dependencyFault(service, dependency, action) {
  await checkpoint(
    `${dependency} outage is observed, alerted, and recovered`,
    async () => {
      own(service);
      const start = Date.now();
      if (action === "pause") docker(["pause", identities.get(service)]);
      else compose(["stop", "--timeout", "10", service]);
      report.faults.push({
        service,
        action,
        containerId: identities.get(service),
        at: new Date().toISOString(),
      });
      save();
      let retainedJob;
      if (dependency === "broker") retainedJob = await job();
      await poll(async () => {
        const r = await fetchBounded(endpoints.management + "/health/ready");
        if (r.status !== 503) return false;
        const state = await r.json();
        return state.checks[dependency] === false;
      }, 30000);
      assert.equal(
        (await fetchBounded(endpoints.management + "/health/live")).status,
        200,
      );
      const firing = await poll(
        () => notification("AtlasDependencyUnavailable", "firing", dependency),
        150000,
      );
      if (retainedJob)
        assert.equal(
          sql(
            `SELECT status FROM "ExportTask" WHERE id='${retainedJob}';`,
          ).trim(),
          "Pending",
        );
      if (action === "pause") docker(["unpause", identities.get(service)]);
      else compose(["start", service]);
      await poll(ready, 90000);
      const resolved = await poll(
        () =>
          notification("AtlasDependencyUnavailable", "resolved", dependency),
        150000,
      );
      if (retainedJob) await waitJob(retainedJob);
      return {
        containerId: identities.get(service),
        firingReceivedAt: firing.receivedAt,
        resolvedReceivedAt: resolved.receivedAt,
        elapsedSeconds: (Date.now() - start) / 1000,
        ...(retainedJob
          ? { retainedPendingJob: retainedJob, recoveredStatus: "Completed" }
          : {}),
      };
    },
  );
}
async function run() {
  const context = docker(["context", "show"]).trim();
  const details = JSON.parse(docker(["context", "inspect", context]))[0];
  assert.match(details.Endpoints.docker.Host, /^(npipe:|unix:)/);
  report.context = context;
  report.containersBefore = inventory();
  assert.ok(!report.containersBefore.some((c) => c.name.startsWith(project)));
  const image = JSON.parse(
    docker(["image", "inspect", "atlas-api:phase4a"]),
  )[0];
  const journalImage = JSON.parse(
    docker(["image", "inspect", "atlas-alert-journal:phase4a"]),
  )[0];
  report.apiImage = image.Id;
  report.journalImage = journalImage.Id;
  const apiEnvironment = {
    NODE_ENV: "production",
    PORT: "4000",
    OBSERVABILITY_ENABLED: "true",
    OBSERVABILITY_HOST: "0.0.0.0",
    OBSERVABILITY_PORT: "9091",
    OBSERVABILITY_SAMPLE_INTERVAL_MS: "1000",
    SHUTDOWN_GRACE_MS: "15000",
    DATABASE_URL: `postgresql://atlas_app:${secrets.runtime}@postgres:5432/${database}?schema=public&connect_timeout=2&pool_timeout=2`,
    REDIS_URL: "redis://redis:6379",
    RABBITMQ_URL: `amqp://atlas:${secrets.broker}@rabbitmq:5672`,
    QUEUE_NAME: queue,
    JWT_SECRET: secrets.jwt,
    JWT_REFRESH_SECRET: secrets.refresh,
    AUTH_PROXY_SECRET: secrets.proxy,
    STORAGE_ENCRYPTION_KEY: secrets.key,
    STORAGE_RETENTION_ENABLED: "false",
    STORAGE_RETENTION_DRY_RUN: "true",
  };
  const ops = path.join(root, "ops/observability").replaceAll("\\", "/");
  const prometheus = fs
    .readFileSync(path.join(ops, "prometheus.yml"), "utf8")
    .replace("scrape_interval: 15s", "scrape_interval: 2s")
    .replace("scrape_timeout: 5s", "scrape_timeout: 1s")
    .replace(
      "evaluation_interval: 15s",
      "scrape_timeout: 1s\n  evaluation_interval: 15s",
    )
    .replace("evaluation_interval: 15s", "evaluation_interval: 2s");
  fs.writeFileSync(path.join(privateDir, "prometheus.yml"), prometheus);
  const config = {
    services: {
      postgres: {
        image: "postgres:15-alpine",
        environment: {
          POSTGRES_USER: "atlas_owner",
          POSTGRES_PASSWORD: secrets.owner,
          POSTGRES_DB: database,
        },
        tmpfs: ["/var/lib/postgresql/data"],
        healthcheck: {
          test: ["CMD-SHELL", `pg_isready -U atlas_owner -d ${database}`],
          interval: "2s",
          retries: 30,
        },
      },
      redis: {
        image: "redis:7-alpine",
        command: ["redis-server", "--appendonly", "yes"],
        volumes: ["redis_data:/data"],
      },
      rabbitmq: {
        image: "rabbitmq:3-management-alpine",
        environment: {
          RABBITMQ_DEFAULT_USER: "atlas",
          RABBITMQ_DEFAULT_PASS: secrets.broker,
        },
        volumes: [
          "rabbitmq_data:/var/lib/rabbitmq",
          `${ops}/rabbitmq-enabled-plugins:/etc/rabbitmq/enabled_plugins:ro`,
        ],
      },
      migrate: {
        image: image.Id,
        command: ["npx", "prisma", "migrate", "deploy"],
        environment: {
          DATABASE_URL: `postgresql://atlas_owner:${secrets.owner}@postgres:5432/${database}?schema=public`,
        },
      },
      api: {
        image: image.Id,
        environment: apiEnvironment,
        volumes: ["vault:/app/apps/api/storage"],
        ports: [...published(4000), ...published(9091)],
        networks: ["default", "inspection"],
        stop_grace_period: "25s",
      },
      "vault-keeper": {
        image: image.Id,
        command: ["node", "-e", "setInterval(()=>{},60000)"],
        volumes: ["vault:/app/apps/api/storage"],
      },
      prometheus: {
        image: "prom/prometheus:v3.15.0",
        command: [
          "--config.file=/etc/prometheus/prometheus.yml",
          "--storage.tsdb.retention.time=1d",
          "--storage.tsdb.retention.size=256MB",
        ],
        volumes: [
          `${path.join(privateDir, "prometheus.yml").replaceAll("\\", "/")}:/etc/prometheus/prometheus.yml:ro`,
          `${ops}/alerts.yml:/etc/prometheus/alerts.yml:ro`,
          "prometheus_data:/prometheus",
        ],
        ports: published(9090),
        networks: ["default", "inspection"],
      },
      alertmanager: {
        image: "prom/alertmanager:v0.34.1",
        command: [
          "--config.file=/etc/alertmanager/alertmanager.yml",
          "--cluster.listen-address=",
        ],
        volumes: [
          `${ops}/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro`,
          "alertmanager_data:/alertmanager",
        ],
        ports: published(9093),
        networks: ["default", "inspection"],
      },
      "alert-journal": {
        image: journalImage.Id,
        volumes: ["journal_data:/data"],
      },
      grafana: {
        image: "grafana/grafana:13.2.4",
        environment: {
          GF_SECURITY_ADMIN_USER: "atlas-operator",
          GF_SECURITY_ADMIN_PASSWORD: secrets.grafana,
          GF_AUTH_ANONYMOUS_ENABLED: "false",
          GF_USERS_ALLOW_SIGN_UP: "false",
          GF_ANALYTICS_REPORTING_ENABLED: "false",
          GF_ANALYTICS_CHECK_FOR_UPDATES: "false",
          GF_PLUGINS_PREINSTALL_DISABLED: "true",
        },
        volumes: [
          `${ops}/grafana/provisioning:/etc/grafana/provisioning:ro`,
          `${ops}/grafana/dashboards:/var/lib/grafana/dashboards:ro`,
          "grafana_data:/var/lib/grafana",
        ],
        ports: published(3000),
        networks: ["default", "inspection"],
      },
    },
    networks: { default: { internal: true }, inspection: {} },
    volumes: {
      vault: {
        driver: "local",
        driver_opts: {
          type: "tmpfs",
          device: "tmpfs",
          o: "size=67108864,uid=1000,gid=1000,mode=0700",
        },
      },
      redis_data: {},
      rabbitmq_data: {},
      prometheus_data: {},
      alertmanager_data: {},
      journal_data: {},
      grafana_data: {},
    },
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
  save();
  await checkpoint(
    "fresh isolated fixture, migrations and restricted grants",
    async () => {
      created = true;
      compose([
        "up",
        "-d",
        "postgres",
        "redis",
        "rabbitmq",
        "vault-keeper",
        "prometheus",
        "alertmanager",
        "alert-journal",
      ]);
      for (const service of [
        "postgres",
        "redis",
        "rabbitmq",
        "vault-keeper",
        "prometheus",
        "alertmanager",
        "alert-journal",
      ])
        own(service);
      await poll(async () => {
        try {
          return sql("SELECT 1;").trim() === "1";
        } catch {
          return false;
        }
      }, 60000);
      compose(["run", "--no-deps", "--name", project + "-migrate", "migrate"]);
      const provision = fs.readFileSync(
        path.join(root, "scripts/database/create-runtime-role.sql"),
        "utf8",
      );
      docker(
        [
          "exec",
          "-i",
          "-e",
          `ATLAS_APP_PASSWORD=${secrets.runtime}`,
          identities.get("postgres"),
          "psql",
          "-X",
          "-v",
          "ON_ERROR_STOP=1",
          "-U",
          "atlas_owner",
          "-d",
          database,
        ],
        { input: provision },
      );
      sql(
        fs.readFileSync(
          path.join(root, "scripts/database/verify-runtime-role.sql"),
          "utf8",
        ),
        true,
      );
      const volume = JSON.parse(
        docker(["volume", "inspect", project + "_vault"]),
      )[0];
      assert.equal(volume.Options.type, "tmpfs");
      assert.match(volume.Options.o, /size=67108864/);
      compose(["up", "-d", "api"]);
      own("api");
      refreshEndpoints();
      await poll(ready, 90000);
      assert.equal(own("api").Config.User, "node");
      return {
        apiImage: image.Id,
        vaultDriver: volume.Driver,
        vaultOptions: volume.Options,
        retentionEnabled: false,
        runtimeRole: "atlas_app",
        ports: endpoints,
      };
    },
  );
  let canaryId, canaryHash;
  await checkpoint(
    "metrics privacy, private management, real worker and durable canary",
    async () => {
      const credentials = {
        email: `phase4a-${randomUUID()}@example.test`,
        password: secret(),
      };
      await api("/auth/register", "POST", credentials);
      const login = await api("/auth/login", "POST", credentials);
      token = login.access_token;
      userId = login.user.id;
      tenantId = (
        await api("/tenants", "POST", { name: "Phase 4A synthetic workspace" })
      ).id;
      canaryId = await job();
      await waitJob(canaryId);
      canaryHash = await download(canaryId);
      const text = await metric();
      assert.match(text, /atlas_export_worker_total\{outcome="completed"\} 1/);
      for (const value of [
        token,
        credentials.email,
        ...Object.values(secrets),
        tenantId,
        canaryId,
      ])
        assert.ok(
          !text.includes(value),
          "Metrics must not contain sensitive or high-cardinality values",
        );
      assert.equal(
        (await fetchBounded(endpoints.api + "/api/metrics")).status,
        404,
      );
      assert.equal(
        (await fetchBounded(endpoints.api + "/metrics")).status,
        404,
      );
      return {
        canaryJob: canaryId,
        plaintextZipSha256: canaryHash,
        managementPublished:
          "fixture loopback only; production has no published management port",
      };
    },
  );
  await dependencyFault("redis", "redis", "stop");
  await dependencyFault("rabbitmq", "broker", "stop");
  await dependencyFault("postgres", "database", "pause");
  await checkpoint(
    "bounded full-vault failure is alerted and existing archives survive",
    async () => {
      const c = own("api");
      const volume = c.Mounts.find(
        (m) => m.Destination === "/app/apps/api/storage",
      );
      assert.equal(volume.Name, project + "_vault");
      const fill =
        "const fs=require('fs');const p=require('path').resolve('storage/phase4a-owned-fill');if(p!=='/app/apps/api/storage/phase4a-owned-fill')throw Error('Wrong vault');const fd=fs.openSync(p,'wx');const b=Buffer.alloc(1048576,7);let n=0;try{for(;n<65;n++)fs.writeSync(fd,b);}catch(e){if(e.code!=='ENOSPC')throw e;}finally{fs.closeSync(fd);}if(n>=65)throw Error('Not the bounded tmpfs');console.log(JSON.stringify({filledMiB:n}));";
      const filled = JSON.parse(docker(["exec", c.Id, "node", "-e", fill]));
      report.faults.push({
        service: "api",
        action: "fill-bounded-tmpfs",
        at: new Date().toISOString(),
        ...filled,
      });
      save();
      const failedJob = await job();
      await waitJob(failedJob, "Failed");
      await poll(() => notification("AtlasVaultSpaceLow", "firing"), 150000);
      docker([
        "exec",
        c.Id,
        "node",
        "-e",
        "const fs=require('fs');const p=require('path').resolve('storage/phase4a-owned-fill');if(p!=='/app/apps/api/storage/phase4a-owned-fill')throw Error('Wrong vault');fs.unlinkSync(p)",
      ]);
      await poll(ready);
      await poll(() => notification("AtlasVaultSpaceLow", "resolved"), 150000);
      assert.equal(await download(canaryId), canaryHash);
      const fresh = await job();
      await waitJob(fresh);
      return {
        ...filled,
        failedJob,
        recoveredJob: fresh,
        existingArchiveSha256: canaryHash,
      };
    },
  );
  await checkpoint(
    "API crash, missing scrape alert, expired lease recovery and retained vault",
    async () => {
      own("api");
      docker(["kill", "--signal", "SIGKILL", identities.get("api")]);
      report.faults.push({
        service: "api",
        action: "SIGKILL",
        containerId: identities.get("api"),
        at: new Date().toISOString(),
      });
      save();
      const recovered = seed("Processing");
      await poll(() => notification("AtlasApiUnavailable", "firing"), 150000);
      compose(["start", "api"]);
      refreshEndpoints();
      await poll(ready);
      await waitJob(recovered);
      assert.equal(
        sql(
          `SELECT "leaseToken" IS NULL FROM "ExportTask" WHERE id='${recovered}';`,
        ).trim(),
        "t",
      );
      await download(recovered);
      assert.equal(await download(canaryId), canaryHash);
      await poll(() => notification("AtlasApiUnavailable", "resolved"), 150000);
      return {
        recoveredLeaseJob: recovered,
        leaseCleared: true,
        existingArchiveSha256: canaryHash,
      };
    },
  );
  await checkpoint(
    "SIGTERM drains an active worker before closing the database",
    async () => {
      const pg = own("postgres");
      const blocker = cp.spawn(
        "docker",
        [
          "exec",
          "-i",
          pg.Id,
          "psql",
          "-X",
          "-v",
          "ON_ERROR_STOP=1",
          "-U",
          "atlas_owner",
          "-d",
          database,
          "-c",
          'BEGIN; LOCK TABLE "AuditLog" IN ACCESS EXCLUSIVE MODE; SELECT pg_sleep(10); COMMIT;',
        ],
        { windowsHide: true, stdio: ["ignore", "ignore", "ignore"] },
      );
      await poll(
        async () =>
          Number(
            sql(
              "SELECT count(*) FROM pg_locks WHERE relation='\"AuditLog\"'::regclass AND mode='AccessExclusiveLock' AND granted;",
            ).trim(),
          ) > 0,
        5000,
      );
      const activeJob = seed();
      const publish = `(async()=>{const c=await require('amqplib').connect(process.env.RABBITMQ_URL);const ch=await c.createConfirmChannel();ch.sendToQueue(process.env.QUEUE_NAME,Buffer.from(JSON.stringify({pattern:'export_logs',data:{jobId:'${activeJob}'}})),{persistent:true});await ch.waitForConfirms();await c.close();})().catch(()=>process.exit(1))`;
      docker(["exec", own("api").Id, "node", "-e", publish]);
      await poll(
        async () => /atlas_export_worker_inflight 1\b/.test(await metric()),
        5000,
      );
      docker(["kill", "--signal", "SIGTERM", identities.get("api")]);
      await poll(async () => {
        const r = await fetchBounded(endpoints.management + "/health/ready");
        return r.status === 503 && (await r.json()).draining;
      }, 5000);
      await poll(async () => !own("api").State.Running, 30000);
      assert.equal(own("api").State.ExitCode, 0);
      assert.equal(
        sql(`SELECT status FROM "ExportTask" WHERE id='${activeJob}';`).trim(),
        "Completed",
      );
      if (blocker.exitCode === null)
        await new Promise((resolve) => blocker.once("exit", resolve));
      const logs = docker(["logs", identities.get("api")]);
      assert.match(logs, /SHUTDOWN_DRAIN_FINISHED/);
      assert.match(logs, /clean/);
      compose(["start", "api"]);
      refreshEndpoints();
      await poll(ready);
      assert.equal(await download(canaryId), canaryHash);
      return { activeJob, shutdownExitCode: 0, completedBeforeExit: true };
    },
  );
  await checkpoint(
    "Grafana provisioned dashboard, datasource, and PromQL are executable",
    async () => {
      await poll(async () => {
        try {
          docker(["image", "inspect", "grafana/grafana:13.2.4"]);
          return true;
        } catch {
          return false;
        }
      }, 600000);
      compose(["up", "-d", "grafana"]);
      own("grafana");
      refreshEndpoints();
      const headers = {
        Authorization:
          "Basic " +
          Buffer.from("atlas-operator:" + secrets.grafana).toString("base64"),
      };
      await poll(
        async () => (await fetchBounded(endpoints.grafana + "/api/health")).ok,
        90000,
      );
      const r = await fetchBounded(
        endpoints.grafana + "/api/dashboards/uid/atlas-operations",
        { headers },
      );
      assert.equal(r.status, 200);
      const data = await r.json();
      assert.equal(data.meta.provisioned, true);
      assert.equal(data.dashboard.panels.length, 26);
      const source = await fetchBounded(
        endpoints.grafana + "/api/datasources/uid/atlas-prometheus/health",
        { headers },
      );
      assert.equal(source.status, 200);
      const panels = [];
      for (const panel of data.dashboard.panels) {
        const result = await query(panel.targets[0].expr);
        panels.push({ title: panel.title, series: result.length });
      }
      assert.ok(
        panels.find((p) => p.title === "API scrape availability").series > 0,
      );
      assert.ok(
        panels.find((p) => p.title === "Broker ready / unacknowledged messages")
          .series > 0,
      );
      assert.ok(
        panels.find((p) => p.title === "Process resident memory").series > 0,
      );
      return {
        uid: data.dashboard.uid,
        provisioned: true,
        panels,
        datasourceHealthy: true,
      };
    },
  );
  report.status = "passed";
}
run()
  .catch((error) => {
    report.status = "failed";
    report.error = redact(error.message);
    process.exitCode = 1;
    console.error(report.error);
  })
  .finally(async () => {
    if (created) {
      try {
        for (const service of identities.keys()) {
          const c = own(service);
          if (c.State.Paused) docker(["unpause", c.Id]);
        }
        for (const service of [
          "api",
          "redis",
          "rabbitmq",
          "postgres",
          "prometheus",
          "alertmanager",
          "alert-journal",
        ])
          if (identities.has(service)) {
            const logs = docker(["logs", identities.get(service)]);
            const file = `${project}-${service}.log`;
            fs.writeFileSync(path.join(evidence, file), redact(logs));
          }
        compose(["stop", "--timeout", "20"]);
      } catch (error) {
        report.cleanupError = redact(error.message);
        report.status = "failed";
        process.exitCode = 1;
      }
    }
    report.containersAfter = inventory();
    report.existingContainersChanged = (report.containersBefore || []).filter(
      (before) =>
        !report.containersAfter.some(
          (after) =>
            before.id === after.id &&
            before.name === after.name &&
            before.image === after.image &&
            before.state === after.state,
        ),
    );
    if (report.existingContainersChanged.length) {
      report.status = "failed";
      process.exitCode = 1;
    }
    report.volumesRetained = true;
    report.finishedAt = new Date().toISOString();
    save();
    console.log(
      JSON.stringify({
        status: report.status,
        report: path.relative(root, reportFile),
        checkpoints: report.checkpoints.length,
        error: report.error,
        cleanupError: report.cleanupError,
      }),
    );
  })
  .finally(() => clearInterval(keepAlive));
