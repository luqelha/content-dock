/* Dedicated local fixture only. Never accepts an external URL/database/container. */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes, createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { inflateRawSync } = require("node:zlib");

const root = path.resolve(__dirname, "../..");
const evidence = path.resolve(
  root,
  process.env.PHASE4B_EVIDENCE_DIR ||
    "docs/improvements/phase-4/evidence/phase-4b",
);
assert.ok(
  evidence.startsWith(root + path.sep),
  "Evidence must remain inside the workspace",
);
const pointer = path.join(root, "artifacts/benchmark/phase4b-state-path.txt");
fs.mkdirSync(evidence, { recursive: true });
const action = process.argv[2];
const label = process.argv[3];
const digest = (data) => createHash("sha256").update(data).digest("hex");
const secret = () => randomBytes(32).toString("hex");
let state;
function docker(args, options = {}) {
  try {
    return execFileSync("docker", args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      timeout: 240000,
      windowsHide: true,
      ...options,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error) {
    // Docker/psql failures can contain credentials. Keep only a redacted diagnostic.
    let detail = String(error.stderr || error.message);
    for (const value of Object.values(state?.secrets || {}))
      detail = detail.replaceAll(value, "[redacted]");
    throw new Error(detail.slice(-3000));
  }
}
function save(name, data) {
  assert.match(name, /^[a-z0-9-]+$/);
  // Labelled evidence is immutable; choose a new label for another attempt.
  if (/^(measure|profile|export)-/.test(name))
    assert.ok(
      !fs.existsSync(path.join(evidence, name + ".json")),
      "Evidence label already exists",
    );
  fs.writeFileSync(
    path.join(evidence, name + ".json"),
    JSON.stringify(data, null, 2) + "\n",
  );
}
function persist() {
  fs.writeFileSync(state.file, JSON.stringify(state), { mode: 0o600 });
}
function compose(args) {
  return docker(["compose", "-p", state.project, "-f", state.config, ...args]);
}
function own(service) {
  assert.match(state.project, /^atlas-phase4b-[a-f0-9]{10}$/);
  const c = JSON.parse(docker(["inspect", `${state.project}-${service}-1`]))[0];
  assert.equal(c.Config.Labels["com.docker.compose.project"], state.project);
  assert.equal(c.Config.Labels["com.docker.compose.service"], service);
  if (state.ids[service]) assert.equal(c.Id, state.ids[service]);
  else {
    state.ids[service] = c.Id;
    persist();
  }
  for (const bindings of Object.values(c.NetworkSettings.Ports || {}))
    for (const binding of bindings || [])
      assert.equal(binding.HostIp, "127.0.0.1");
  // Stopping an owned container is safe even when a setup attempt rejected a mount.
  if (action !== "stop")
    for (const m of c.Mounts.filter((m) => m.Type === "volume"))
      assert.ok(m.Name.startsWith(state.project + "_"));
  if (service === "postgres")
    assert.ok(
      Object.hasOwn(c.HostConfig.Tmpfs || {}, "/var/lib/postgresql/data"),
    );
  return c;
}
function sql(query, runtime = false) {
  const c = own("postgres");
  assert.match(state.database, /^atlas_phase4b_test_[a-f0-9]{10}$/);
  return docker(
    [
      "exec",
      "-i",
      c.Id,
      "psql",
      "-X",
      "-q",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      runtime ? "atlas_app" : "atlas_owner",
      "-d",
      state.database,
      "-At",
    ],
    { input: query },
  ).trim();
}
function redis(args) {
  return docker(["exec", own("redis").Id, "redis-cli", ...args]).trim();
}
async function poll(fn, timeout = 90000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value) return value;
    } catch {
      /* bounded startup/poll */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw Error("Fixture deadline exceeded");
}
async function call(route, tenant, method = "GET", body, raw = false) {
  // Let socket close events run after synchronous Docker/psql work before reusing HTTP connections.
  await new Promise((resolve) => setImmediate(resolve));
  const url = new URL(state.api + "/api" + route);
  assert.equal(url.hostname, "127.0.0.1");
  let response;
  try {
    response = await fetch(url, {
      method,
      signal: AbortSignal.timeout(30000),
      headers: {
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(state.token ? { Authorization: "Bearer " + state.token } : {}),
        ...(tenant ? { "x-tenant-id": tenant.id } : {}),
      },
      ...(body
        ? { body: body instanceof FormData ? body : JSON.stringify(body) }
        : {}),
    });
  } catch (error) {
    throw Error(
      `${method} ${url.pathname}: ${error.message} (${error.cause?.code || error.cause?.message || "no cause"})`,
    );
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok)
    throw Error(`${method} ${url.pathname}: HTTP ${response.status}`);
  return raw ? bytes : JSON.parse(bytes);
}
async function metrics() {
  await new Promise((resolve) => setImmediate(resolve));
  const response = await fetch(state.management + "/metrics", {
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200);
  return response.text();
}
async function login() {
  state.token = (
    await call("/auth/login", null, "POST", {
      email: `phase4b-${state.project.slice(-10)}@example.test`,
      password: state.secrets.password,
    })
  ).access_token;
  persist();
}
function series(text) {
  return Object.fromEntries(
    text
      .split("\n")
      .filter((s) => /^atlas_/.test(s))
      .map((s) => {
        const i = s.lastIndexOf(" ");
        return [s.slice(0, i), Number(s.slice(i + 1))];
      }),
  );
}
function changes(before, after) {
  const b = series(before),
    a = series(after);
  return Object.fromEntries(
    Object.entries(a)
      .filter(([k]) => /(_total|_sum|_count)(\{|$)/.test(k))
      .map(([k, v]) => [k, v - (b[k] || 0)]),
  );
}
function inventory() {
  return docker(["ps", "-a", "--format", "{{json .}}"])
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(JSON.parse)
    .map((c) => ({ id: c.ID, name: c.Names, state: c.State, image: c.Image }));
}
function fingerprint() {
  const files = docker([
    "exec",
    own("api").Id,
    "node",
    "-e",
    "const f=require('fs'),p=require('path'),c=require('crypto');let o={};function walk(d){for(const x of f.readdirSync(d)){const n=p.join(d,x);if(f.statSync(n).isDirectory())walk(n);else if(n.endsWith('.js'))o[n]=c.createHash('sha256').update(f.readFileSync(n,'utf8').replaceAll('\\r\\n','\\n')).digest('hex')}}walk('dist');console.log(JSON.stringify(o))",
  ]);
  return JSON.parse(files);
}
async function setup() {
  assert.equal(label, "--run-isolated", "setup requires --run-isolated");
  if (fs.existsSync(pointer)) {
    const previous = JSON.parse(
      fs.readFileSync(fs.readFileSync(pointer, "utf8"), "utf8"),
    );
    assert.match(previous.project, /^atlas-phase4b-[a-f0-9]{10}$/);
    for (const id of Object.values(previous.ids)) {
      const c = JSON.parse(docker(["inspect", id]))[0];
      assert.equal(
        c.Config.Labels["com.docker.compose.project"],
        previous.project,
      );
      assert.ok(
        !c.State.Running,
        "Stop the active fixture before setting up another one",
      );
    }
  }
  const context = docker(["context", "show"]).trim();
  const info = JSON.parse(docker(["context", "inspect", context]))[0];
  assert.match(info.Endpoints.docker.Host, /^(npipe:|unix:)/);
  const suffix = randomBytes(5).toString("hex");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-phase4b-"));
  const image = JSON.parse(
    docker([
      "image",
      "inspect",
      process.env.PHASE4B_API_IMAGE || "atlas-api:phase4b-baseline",
    ]),
  )[0];
  state = {
    file: path.join(dir, "state.json"),
    config: path.join(dir, "compose.json"),
    project: "atlas-phase4b-" + suffix,
    database: "atlas_phase4b_test_" + suffix,
    image: image.Id,
    ids: {},
    secrets: Object.fromEntries(
      [
        "owner",
        "runtime",
        "broker",
        "jwt",
        "refresh",
        "key",
        "proxy",
        "password",
      ].map((k) => [k, secret()]),
    ),
    before: inventory(),
    tenants: [],
  };
  persist();
  fs.mkdirSync(path.dirname(pointer), { recursive: true });
  fs.writeFileSync(pointer, state.file);
  const ports = (target) => [{ target, published: "0", host_ip: "127.0.0.1" }];
  const environment = {
    NODE_ENV: "production",
    PORT: "4000",
    OBSERVABILITY_ENABLED: "true",
    OBSERVABILITY_HOST: "0.0.0.0",
    OBSERVABILITY_PORT: "9091",
    OBSERVABILITY_SAMPLE_INTERVAL_MS: "1000",
    SHUTDOWN_GRACE_MS: "15000",
    DATABASE_URL: `postgresql://atlas_app:${state.secrets.runtime}@postgres:5432/${state.database}?schema=public&connection_limit=10&pool_timeout=5`,
    REDIS_URL: "redis://redis:6379",
    RABBITMQ_URL: `amqp://atlas:${state.secrets.broker}@rabbitmq:5672`,
    QUEUE_NAME: state.project,
    JWT_SECRET: state.secrets.jwt,
    JWT_REFRESH_SECRET: state.secrets.refresh,
    AUTH_PROXY_SECRET: state.secrets.proxy,
    STORAGE_ENCRYPTION_KEY: state.secrets.key,
    STORAGE_RETENTION_ENABLED: "false",
    STORAGE_RETENTION_DRY_RUN: "true",
  };
  const config = {
    services: {
      postgres: {
        image: "postgres:15-alpine",
        command: [
          "postgres",
          "-c",
          "shared_preload_libraries=pg_stat_statements",
          "-c",
          "track_io_timing=on",
        ],
        environment: {
          POSTGRES_USER: "atlas_owner",
          POSTGRES_PASSWORD: state.secrets.owner,
          POSTGRES_DB: state.database,
        },
        tmpfs: ["/var/lib/postgresql/data"],
        shm_size: "256m",
      },
      redis: { image: "redis:7-alpine", volumes: ["redis_data:/data"] },
      rabbitmq: {
        image: "rabbitmq:3-management-alpine",
        volumes: ["rabbitmq_data:/var/lib/rabbitmq"],
        environment: {
          RABBITMQ_DEFAULT_USER: "atlas",
          RABBITMQ_DEFAULT_PASS: state.secrets.broker,
        },
      },
      migrate: {
        image: image.Id,
        command: ["npx", "prisma", "migrate", "deploy"],
        environment: {
          DATABASE_URL: `postgresql://atlas_owner:${state.secrets.owner}@postgres:5432/${state.database}?schema=public`,
        },
      },
      api: {
        image: image.Id,
        environment,
        ports: [...ports(4000), ...ports(9091)],
        volumes: ["vault:/app/apps/api/storage"],
        networks: ["default", "inspection"],
        stop_grace_period: "25s",
      },
    },
    networks: { default: { internal: true }, inspection: {} },
    volumes: { vault: {}, redis_data: {}, rabbitmq_data: {} },
  };
  fs.writeFileSync(state.config, JSON.stringify(config), { mode: 0o600 });
  compose(["up", "-d", "postgres", "redis", "rabbitmq"]);
  for (const s of ["postgres", "redis", "rabbitmq"]) own(s);
  await poll(() => sql("SELECT 1") === "1");
  assert.equal(
    sql("SELECT count(*) FROM pg_tables WHERE schemaname='public'"),
    "0",
  );
  compose([
    "run",
    "--no-deps",
    "--name",
    state.project + "-migrate",
    "migrate",
  ]);
  docker(
    [
      "exec",
      "-i",
      "-e",
      "ATLAS_APP_PASSWORD=" + state.secrets.runtime,
      own("postgres").Id,
      "psql",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "atlas_owner",
      "-d",
      state.database,
    ],
    {
      input: fs.readFileSync(
        path.join(root, "scripts/database/create-runtime-role.sql"),
        "utf8",
      ),
    },
  );
  sql(
    fs.readFileSync(
      path.join(root, "scripts/database/verify-runtime-role.sql"),
      "utf8",
    ),
    true,
  );
  sql("CREATE EXTENSION pg_stat_statements;");
  compose(["up", "-d", "api"]);
  const c = own("api");
  assert.equal(c.Config.User, "node");
  state.api =
    "http://127.0.0.1:" + c.NetworkSettings.Ports["4000/tcp"][0].HostPort;
  state.management =
    "http://127.0.0.1:" + c.NetworkSettings.Ports["9091/tcp"][0].HostPort;
  persist();
  return seedFixture();
}
async function seedFixture() {
  console.log("Waiting for bounded fixture readiness");
  await poll(
    async () =>
      (
        await fetch(state.management + "/health/ready", {
          signal: AbortSignal.timeout(3000),
        })
      ).status === 200,
  );
  console.log("Readiness passed; verifying current compiled code");
  const compiled = fingerprint();
  const local = {};
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith(".js"))
        local[
          path.relative(path.join(root, "apps/api"), file).replaceAll("\\", "/")
        ] = digest(fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n"));
    }
  }
  walk(path.join(root, "apps/api/dist"));
  assert.deepEqual(
    compiled,
    local,
    "Build the current API locally; every emitted JS must match the fixture image",
  );
  if (!state.tenants.length) {
    console.log("Compiled code verified; creating synthetic account");
    const credentials = {
      email: `phase4b-${state.project.slice(-10)}@example.test`,
      password: state.secrets.password,
    };
    await call("/auth/register", null, "POST", credentials);
    state.token = (
      await call("/auth/login", null, "POST", credentials)
    ).access_token;
    state.userId = JSON.parse(
      Buffer.from(state.token.split(".")[1], "base64url"),
    ).sub;
    // One synthetic administrator belongs to all five workspaces.
    for (let i = 0; i < 5; i++)
      state.tenants.push(
        await call("/tenants", null, "POST", { name: `Phase4B tenant ${i}` }),
      );
    persist();
    console.log("Seeding representative dataset");
    let seed = "";
    for (let t = 0; t < 5; t++) {
      const tenant = state.tenants[t];
      const count = t === 4 ? 25 : 20000;
      seed += `INSERT INTO "Category" (id,name,slug,"tenantId","updatedAt") SELECT '${tenant.id}-cat-'||n,'Category '||n,'category-'||n,'${tenant.id}',now() FROM generate_series(1,20) n;\n`;
      seed += `INSERT INTO "Content" (id,title,slug,body,status,"authorId","tenantId","categoryId","createdAt","updatedAt") SELECT '${tenant.id}-content-'||n,'Record '||n,'record-'||n,'<p>'||repeat(md5(n::text),64)||'</p>',CASE WHEN n%4=0 THEN 'PUBLISHED'::"ContentStatus" ELSE 'DRAFT'::"ContentStatus" END,'${state.userId}','${tenant.id}','${tenant.id}-cat-'||(1+n%20),now()-n*interval '1 minute',now()-((${count}-n)*interval '1 minute') FROM generate_series(1,${count}) n;\n`;
      if (t < 4) {
        seed += `INSERT INTO "Media" (id,url,type,"tenantId","createdAt") SELECT '${tenant.id}-media-'||n,'/uploads/metadata-only-'||n||'.png','image/png','${tenant.id}',now()-n*interval '1 minute' FROM generate_series(1,2000) n;\n`;
        seed += `INSERT INTO "AuditLog" (id,"tenantId","userId",action,entity,details,"createdAt") SELECT md5('${tenant.id}'||n), '${tenant.id}','${state.userId}',CASE WHEN n%5=0 THEN 'UPDATE' ELSE 'CREATE' END,'Content',jsonb_build_object('fixture',true,'ordinal',n,'note',repeat(md5(n::text),8)),TIMESTAMP '2026-10-01 00:00:00'+n*interval '1 second' FROM generate_series(1,25000) n;\n`;
      }
    }
    sql(seed + "ANALYZE;");
  }
  assert.equal(sql('SELECT count(*) FROM "Content"'), "80025");
  if (!state.mediaUrl) await mediaFixture();
  save("fixture", {
    measuredAt: new Date().toISOString(),
    project: state.project,
    database: state.database,
    apiImage: state.image,
    compiledFiles: compiled,
    currentLocalBuildMatchesImage: true,
    containersBefore: state.before,
    containers: Object.keys(state.ids).map((s) => ({
      service: s,
      id: state.ids[s],
      image: own(s).Image,
    })),
    host: {
      node: process.version,
      platform: os.platform(),
      cpu: os.cpus()[0].model,
      logicalCpus: os.cpus().length,
      memoryBytes: os.totalmem(),
    },
    server: JSON.parse(
      docker([
        "exec",
        own("api").Id,
        "node",
        "-e",
        "console.log(JSON.stringify({node:process.version,cpu:require('os').cpus().length}))",
      ]),
    ),
    dataset: {
      tenants: 5,
      largeTenants: 4,
      contentPerLargeTenant: 20000,
      contentBodyBytes: 2055,
      auditRowsPerLargeTenant: 25000,
      mediaMetadataPerLargeTenant: 2000,
      smallTenantContents: 25,
    },
    runtimeRoleVerified: true,
    poolConnectionLimit: 10,
    retentionEnabled: false,
    databaseVersion: sql("SELECT version()"),
    databaseSettings: JSON.parse(
      sql(
        "SELECT json_build_object('shared_buffers',current_setting('shared_buffers'),'work_mem',current_setting('work_mem'),'max_connections',current_setting('max_connections'))",
      ),
    ),
  });
  console.log("Fixture ready: " + state.project);
}
async function mediaFixture() {
  const form = new FormData();
  // A real image, distinct from metadata-only list records, exercises sanitization + encrypted IO.
  const png = docker([
    "exec",
    own("api").Id,
    "node",
    "-e",
    "require('sharp')({create:{width:1280,height:720,channels:3,background:{r:60,g:100,b:150}}}).png().toBuffer().then(b=>process.stdout.write(b.toString('base64')))",
  ]);
  form.append(
    "file",
    new Blob([Buffer.from(png, "base64")], { type: "image/png" }),
    "fixture.png",
  );
  const media = await call("/media/upload", state.tenants[0], "POST", form);
  state.mediaUrl = "/media-files/" + media.url.split("/").pop();
  persist();
}

function explain() {
  const tenant = state.tenants[0].id;
  const queries = {
    dashboardRecent: `SELECT id,title,status,"updatedAt","categoryId","authorId" FROM "Content" WHERE "tenantId"='${tenant}' ORDER BY "updatedAt" DESC LIMIT 8`,
    publishedPage: `SELECT id,title,slug,status,"createdAt","authorId","categoryId" FROM "Content" WHERE "tenantId"='${tenant}' AND status='PUBLISHED' ORDER BY "createdAt" DESC LIMIT 20`,
    publishedCount: `SELECT count(*) FROM "Content" WHERE "tenantId"='${tenant}' AND status='PUBLISHED'`,
    mediaPage: `SELECT * FROM "Media" WHERE "tenantId"='${tenant}' ORDER BY "createdAt" DESC,id DESC LIMIT 20`,
    auditPage: `SELECT * FROM "AuditLog" WHERE "tenantId"='${tenant}' ORDER BY "createdAt" DESC LIMIT 20`,
    exportPage: `SELECT * FROM "AuditLog" WHERE "tenantId"='${tenant}' AND "createdAt">='2026-10-01' AND "createdAt"<'2026-10-02' ORDER BY id ASC LIMIT 500`,
  };
  return Object.fromEntries(
    Object.entries(queries).map(([name, query]) => [
      name,
      {
        query,
        executions: Array.from(
          { length: 5 },
          () =>
            JSON.parse(
              sql("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + query),
            )[0],
        ),
      },
    ]),
  );
}
function pgStats() {
  return JSON.parse(
    sql(
      `SELECT coalesce(json_agg(s),'[]') FROM (SELECT query,calls,round(total_exec_time::numeric,3) AS total_ms,round(mean_exec_time::numeric,3) AS mean_ms,rows,shared_blks_hit,shared_blks_read,temp_blks_written FROM pg_stat_statements WHERE userid=(SELECT oid FROM pg_roles WHERE rolname='atlas_app') ORDER BY total_exec_time DESC LIMIT 20) s`,
    ),
  );
}
async function profile() {
  assert.match(label, /^[a-z0-9-]+$/);
  assert.ok(
    !fs.existsSync(path.join(evidence, "profile-" + label + ".json")),
    "Choose a fresh evidence label/directory",
  );
  save("profile-" + label, {
    measuredAt: new Date().toISOString(),
    project: state.project,
    plans: explain(),
    topStatements: pgStats(),
    sizes: JSON.parse(
      sql(
        `SELECT json_agg(s) FROM (SELECT relname,pg_relation_size(oid) bytes,pg_indexes_size(oid) index_bytes FROM pg_class WHERE relname IN ('Content','AuditLog','Media')) s`,
      ),
    ),
  });
  console.log("Profile saved: " + label);
}
function validateContent(page, tenant) {
  assert.ok(Array.isArray(page.data));
  assert.ok(page.data.length > 0 && page.data.length <= 20);
  assert.equal(page.meta.itemCount, tenant === state.tenants[4] ? 25 : 20000);
  for (const row of page.data) assert.equal(row.tenantId, tenant.id);
}
async function load(name, count, concurrency, request) {
  const before = await metrics();
  sql("SELECT pg_stat_statements_reset();");
  let next = 0,
    failed = 0;
  const failures = {},
    durations = [],
    byOperation = {};
  const samples = [];
  let sampling = false;
  const sample = async () => {
    if (sampling) return;
    sampling = true;
    try {
      const values = series(await metrics());
      samples.push({
        at: performance.now(),
        rssBytes: values.atlas_process_resident_memory_bytes,
        eventLoopP99Seconds: values.atlas_nodejs_eventloop_lag_p99_seconds,
      });
    } finally {
      sampling = false;
    }
  };
  const timer = setInterval(() => sample().catch(() => {}), 500);
  await sample();
  const start = performance.now();
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (true) {
        const i = next++;
        if (i >= count) break;
        const began = performance.now();
        let kind;
        try {
          kind = await request(i);
        } catch (error) {
          failed++;
          failures[error.message] = (failures[error.message] || 0) + 1;
        }
        const duration = performance.now() - began;
        durations.push(duration);
        if (typeof kind === "string") (byOperation[kind] ||= []).push(duration);
      }
    }),
  );
  const elapsedMs = performance.now() - start;
  clearInterval(timer);
  await sample();
  const after = await metrics();
  const delta = changes(before, after);
  const b = series(before),
    a = series(after);
  durations.sort((x, y) => x - y);
  const p = (q) => durations[Math.ceil(durations.length * q) - 1];
  const result = {
    name,
    requests: count,
    concurrency,
    failed,
    failures,
    elapsedMs,
    requestsPerSecond: (count / elapsedMs) * 1000,
    p50Ms: p(0.5),
    p95Ms: p(0.95),
    p99Ms: p(0.99),
    apiCpuSeconds:
      a.atlas_process_cpu_seconds_total - b.atlas_process_cpu_seconds_total,
    peakSampledRssBytes: Math.max(...samples.map((s) => s.rssBytes || 0)),
    samples,
    metricsDelta: delta,
    topStatements: pgStats(),
    durationsMs: durations,
    byOperation: Object.fromEntries(
      Object.entries(byOperation).map(([kind, values]) => {
        values.sort((x, y) => x - y);
        return [
          kind,
          {
            requests: values.length,
            p50Ms: values[Math.ceil(values.length * 0.5) - 1],
            p95Ms: values[Math.ceil(values.length * 0.95) - 1],
            p99Ms: values[Math.ceil(values.length * 0.99) - 1],
          },
        ];
      }),
    ),
  };
  console.log(
    `${name}: p95=${result.p95Ms.toFixed(1)}ms rps=${result.requestsPerSecond.toFixed(1)} failed=${failed}`,
  );
  return result;
}
async function measure() {
  assert.match(label, /^[a-z0-9-]+$/);
  assert.ok(
    !fs.existsSync(path.join(evidence, "measure-" + label + ".json")),
    "Choose a fresh evidence label/directory",
  );
  await login();
  const results = [];
  // Warm JIT, DB buffers, auth and response cache identically for every arm.
  const tenants = state.tenants.slice(0, 4);
  for (let i = 0; i < 100; i++) {
    const tenant = tenants[i % 4];
    await call("/analytics/dashboard", tenant);
    await call("/contents?page=1&take=20&summary=true", tenant);
  }
  await call("/contents?page=1&take=20", state.tenants[4]);
  for (let round = 1; round <= 2; round++) {
    console.log("Round " + round + ": " + label);
    results.push(
      await load("historical-warm", 1000, 25, async () =>
        validateContent(
          await call("/contents?page=1&take=20", state.tenants[4]),
          state.tenants[4],
        ),
      ),
    );
    results.push(
      await load("multi-tenant-warm", 1000, 25, async (i) => {
        const tenant = tenants[i % 4];
        validateContent(
          await call("/contents?page=1&take=20&summary=true", tenant),
          tenant,
        );
      }),
    );
    // Cold response cache, warm PostgreSQL buffers. Each URL is distinct within a round.
    for (const t of tenants) redis(["INCR", "cache-revision:" + t.id]);
    results.push(
      await load("multi-tenant-cold", 400, 16, async (i) => {
        const tenant = tenants[i % 4];
        validateContent(
          await call(
            `/contents?page=${1 + Math.floor(i / 4)}&take=20&summary=true`,
            tenant,
          ),
          tenant,
        );
      }),
    );
    results.push(
      await load("dashboard", 600, 16, async (i) => {
        const page = await call("/analytics/dashboard", tenants[i % 4]);
        assert.equal(page.totalContent, 20000);
        assert.equal(page.recentContent.length, 8);
      }),
    );
    results.push(
      await load("mixed", 500, 16, async (i) => {
        const tenant = tenants[i % 4];
        if (i % 5 === 0) {
          const id = tenant.id + "-content-" + (1 + i);
          // Same value across arms: equivalent indexed writes without changing the fixture distribution.
          const row = await call("/contents/" + id, tenant, "PATCH", {
            status: (1 + i) % 4 === 0 ? "PUBLISHED" : "DRAFT",
          });
          assert.equal(row.id, id);
          return "content-update";
        } else if (i % 5 === 1) {
          assert.equal(
            (await call("/analytics/dashboard", tenant)).totalContent,
            20000,
          );
          return "dashboard";
        } else if (i % 5 === 2) {
          const page = await call("/media?page=1&take=20", tenant);
          assert.equal(page.length, 20);
          for (const row of page) assert.equal(row.tenantId, tenant.id);
          return "media-list";
        } else if (i % 5 === 3) {
          const page = await call("/audit-logs?page=1&limit=20", tenant);
          assert.equal(page.data.length, 20);
          for (const row of page.data) assert.equal(row.tenantId, tenant.id);
          return "audit-list";
        } else {
          validateContent(
            await call("/contents?page=1&take=20&summary=true", tenant),
            tenant,
          );
          return "content-list";
        }
      }),
    );
    results.push(
      await load("media-read", 200, 8, async () => {
        const bytes = await call(
          state.mediaUrl,
          tenants[0],
          "GET",
          undefined,
          true,
        );
        assert.ok(bytes.length > 100);
        assert.equal(bytes.subarray(1, 4).toString(), "PNG");
      }),
    );
  }
  const report = {
    measuredAt: new Date().toISOString(),
    label,
    project: state.project,
    harnessSha256: digest(fs.readFileSync(__filename)),
    image: state.image,
    indexes: sql(
      `SELECT indexname FROM pg_indexes WHERE tablename='Content' ORDER BY indexname`,
    ).split("\n"),
    results,
  };
  save("measure-" + label, report);
  assert.equal(
    results.reduce((n, r) => n + r.failed, 0),
    0,
    "Workload errors invalidate the comparison",
  );
}

// Fully decode ZIP central directory and NDJSON; PK magic alone is insufficient.
function readArchive(zip) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0);
  assert.equal(zip.readUInt16LE(end + 10), 1);
  const central = zip.readUInt32LE(end + 16);
  assert.equal(zip.readUInt32LE(central), 0x02014b50);
  const compressedSize = zip.readUInt32LE(central + 20);
  const size = zip.readUInt32LE(central + 24);
  const offset = zip.readUInt32LE(central + 42);
  const begin =
    offset + 30 + zip.readUInt16LE(offset + 26) + zip.readUInt16LE(offset + 28);
  const compressed = zip.subarray(begin, begin + compressedSize);
  const data =
    zip.readUInt16LE(central + 10) === 8
      ? inflateRawSync(compressed)
      : compressed;
  assert.equal(data.length, size);
  assert.equal(
    zip
      .subarray(central + 46, central + 46 + zip.readUInt16LE(central + 28))
      .toString(),
    "audit-logs.ndjson",
  );
  return data.toString().trim().split("\n").map(JSON.parse);
}
async function exportCheck() {
  assert.match(label, /^[a-z0-9-]+$/);
  assert.ok(
    !fs.existsSync(path.join(evidence, "export-" + label + ".json")),
    "Choose a fresh evidence label/directory",
  );
  await login();
  const results = [];
  for (let i = 0; i < 3; i++) {
    const tenant = state.tenants[i];
    const began = performance.now();
    const job = (
      await call("/export/logs", tenant, "POST", {
        startDate: "2026-10-01",
        endDate: "2026-10-01",
      })
    ).data;
    await poll(async () => {
      const status = (await call("/export/status/" + job.jobId, tenant)).data
        .status;
      assert.notEqual(status, "Failed");
      return status === "Completed";
    });
    const completedMs = performance.now() - began;
    const zip = await call(
      "/export/download/" + job.jobId,
      tenant,
      "GET",
      undefined,
      true,
    );
    const rows = readArchive(zip);
    assert.equal(rows.length, 25000);
    assert.equal(new Set(rows.map((r) => r.id)).size, 25000);
    for (const row of rows) assert.equal(row.tenantId, tenant.id);
    results.push({
      completedMs,
      downloadAndValidateMs: performance.now() - began - completedMs,
      zipBytes: zip.length,
      rows: rows.length,
      sha256: digest(zip),
    });
  }
  save("export-" + label, { measuredAt: new Date().toISOString(), results });
  console.log("Validated 3 real exports of 25,000 rows: " + label);
}
async function stop() {
  for (const s of Object.keys(state.ids)) own(s);
  compose(["stop", "--timeout", "25"]);
  const after = inventory();
  const unrelatedAfter = after.filter((c) => !c.name.startsWith(state.project));
  for (const before of state.before) {
    const found = unrelatedAfter.find((c) => c.id === before.id);
    assert.ok(found, "Existing container missing: " + before.name);
    assert.equal(
      found.state,
      before.state,
      "Existing container changed: " + before.name,
    );
  }
  save("preservation-" + state.project.slice(-10), {
    measuredAt: new Date().toISOString(),
    containersBefore: state.before,
    containersAfter: after,
    unrelatedContainerIdentityAndStatePreserved: true,
    fixtureStopped: Object.keys(state.ids).every((s) => !own(s).State.Running),
    volumesRetained: true,
  });
  console.log("Fixture stopped; existing containers preserved.");
}
async function indexes() {
  const file = path.join(
    root,
    "apps/api/prisma/migrations/20261016000000_dashboard_query_indexes/migration.sql",
  );
  const statusFile = path.join(
    root,
    "apps/api/prisma/migrations/20261016000100_published_count_index/migration.sql",
  );
  assert.ok(["migrate", "on", "off", "recover-fixture"].includes(label));
  const began = performance.now();
  if (label === "migrate" || label === "recover-fixture") {
    const mount =
      path.join(root, "apps/api/prisma").replaceAll("\\", "/") +
      ":/app/apps/api/prisma:ro";
    compose([
      "run",
      "--no-deps",
      "--name",
      state.project + "-migrate-" + Date.now(),
      "--volume",
      mount,
      "migrate",
      ...(label === "recover-fixture"
        ? [
            "npx",
            "prisma",
            "migrate",
            "resolve",
            "--rolled-back",
            "20261016000000_dashboard_query_indexes",
          ]
        : []),
    ]);
    if (label === "recover-fixture")
      return console.log("Failed fixture migration marked rolled back");
  } else if (label === "on") {
    sql(fs.readFileSync(file, "utf8"));
    sql(fs.readFileSync(statusFile, "utf8"));
  } else {
    sql('DROP INDEX CONCURRENTLY "Content_tenantId_updatedAt_idx";');
    sql('DROP INDEX CONCURRENTLY "Content_tenantId_status_idx";');
  }
  sql('ANALYZE "Content";');
  const rows = JSON.parse(
    sql(
      `SELECT coalesce(json_agg(s),'[]') FROM (SELECT c.relname AS name,i.indisvalid AS valid,pg_relation_size(c.oid) AS bytes,pg_get_indexdef(c.oid) AS definition FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relname IN ('Content_tenantId_updatedAt_idx','Content_tenantId_status_idx')) s`,
    ),
  );
  assert.equal(rows.length, label === "off" ? 0 : 2);
  assert.ok(rows.every((r) => r.valid));
  sql(
    fs.readFileSync(
      path.join(root, "scripts/database/verify-runtime-role.sql"),
      "utf8",
    ),
    true,
  );
  save("indexes-" + label + "-" + Date.now(), {
    measuredAt: new Date().toISOString(),
    project: state.project,
    label,
    elapsedMs: performance.now() - began,
    rows,
    migrationSha256: digest(fs.readFileSync(file)),
    runtimeGrantsStillValid: true,
  });
  console.log("Fixture indexes: " + label);
}
async function verify() {
  await login();
  const results = [];
  for (const tenant of state.tenants.slice(0, 4)) {
    const expected = JSON.parse(
      sql(
        `SELECT json_build_object('total',(SELECT count(*) FROM "Content" WHERE "tenantId"='${tenant.id}'),'published',(SELECT count(*) FROM "Content" WHERE "tenantId"='${tenant.id}' AND status='PUBLISHED'),'recent',(SELECT json_agg(id) FROM (SELECT id FROM "Content" WHERE "tenantId"='${tenant.id}' ORDER BY "updatedAt" DESC LIMIT 8) s))`,
      ),
    );
    const actual = await call("/analytics/dashboard", tenant);
    assert.equal(actual.totalContent, expected.total);
    assert.equal(actual.published, expected.published);
    assert.equal(actual.drafts, expected.total - expected.published);
    assert.deepEqual(
      actual.recentContent.map((r) => r.id),
      expected.recent,
    );
    const published = await call(
      "/contents?status=PUBLISHED&take=20&summary=true",
      tenant,
    );
    assert.equal(published.meta.itemCount, expected.published);
    assert.ok(
      published.data.every(
        (r) =>
          r.tenantId === tenant.id &&
          r.status === "PUBLISHED" &&
          !("body" in r),
      ),
    );
    results.push({
      tenantId: tenant.id,
      countsAndRecentOrderMatchDatabase: true,
      publishedFilterAndSummaryValid: true,
    });
  }
  // This actor belongs to both workspaces; resource IDs must still be scoped to the chosen tenant.
  await assert.rejects(
    () =>
      call("/contents/" + state.tenants[0].id + "-content-1", state.tenants[1]),
    /HTTP 404/,
  );
  await assert.rejects(
    () => call(state.mediaUrl, state.tenants[1], "GET", undefined, true),
    /HTTP 404/,
  );
  const fresh = state.database + "_fresh_test";
  assert.equal(
    sql(`SELECT count(*) FROM pg_database WHERE datname='${fresh}'`),
    "0",
  );
  sql(`CREATE DATABASE "${fresh}";`);
  const mount =
    path.join(root, "apps/api/prisma").replaceAll("\\", "/") +
    ":/app/apps/api/prisma:ro";
  const url = `postgresql://atlas_owner:${state.secrets.owner}@postgres:5432/${fresh}?schema=public`;
  compose([
    "run",
    "--no-deps",
    "--name",
    state.project + "-fresh-migrate",
    "--volume",
    mount,
    "-e",
    "DATABASE_URL=" + url,
    "migrate",
  ]);
  const query =
    "SELECT count(*) FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE i.indisvalid AND c.relname IN ('Content_tenantId_updatedAt_idx','Content_tenantId_status_idx');";
  const valid = docker(
    [
      "exec",
      "-i",
      own("postgres").Id,
      "psql",
      "-X",
      "-U",
      "atlas_owner",
      "-d",
      fresh,
      "-At",
    ],
    { input: query },
  ).trim();
  assert.equal(valid, "2");
  // Idempotence: a second deploy must succeed without executing the concurrent builds again.
  compose([
    "run",
    "--no-deps",
    "--name",
    state.project + "-fresh-redeploy",
    "--volume",
    mount,
    "-e",
    "DATABASE_URL=" + url,
    "migrate",
  ]);
  save("correctness", {
    measuredAt: new Date().toISOString(),
    results,
    crossTenantContentDenied: true,
    crossTenantMediaDenied: true,
    freshDatabaseMigrationsPassed: true,
    freshDatabase: fresh,
    repeatedDeployPassed: true,
    validIndexes: Number(valid),
  });
  console.log(
    "Correctness, cross-tenant resources, fresh migrations and repeated deploy passed",
  );
}
async function main() {
  if (action === "setup") return setup();
  const file = fs.readFileSync(pointer, "utf8");
  const resolved = path.resolve(file);
  assert.ok(
    resolved.startsWith(
      path.resolve(os.tmpdir()) + path.sep + "atlas-phase4b-",
    ),
  );
  state = JSON.parse(fs.readFileSync(resolved, "utf8"));
  assert.equal(state.file, resolved);
  for (const s of Object.keys(state.ids)) own(s);
  if (action === "seed") return seedFixture();
  if (action === "media-fixture") return mediaFixture();
  if (action === "indexes") return indexes();
  if (action === "verify") return verify();
  if (action === "profile") return profile();
  if (action === "measure") return measure();
  if (action === "export") return exportCheck();
  if (action === "stop") return stop();
  throw Error(
    "Usage: phase4b.cjs setup --run-isolated | seed | profile LABEL | measure LABEL | export LABEL | indexes migrate|on|off | verify | stop",
  );
}
const keepAlive = setInterval(() => {}, 1000);
main()
  .catch((error) => {
    save("failure-" + Date.now(), {
      action,
      label,
      project: state?.project,
      error: error.message,
    });
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => clearInterval(keepAlive));
