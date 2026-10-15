// Opt-in, fresh local Docker projects ONLY. Never loads application .env files.
// No existing database resets, volume deletion, production targets or published ports.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { randomBytes, createHash } = require("node:crypto");
const root = path.resolve(__dirname, "../..");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const report = {
  startedAt: new Date().toISOString(),
  scope: "isolated-local-synthetic",
  steps: [],
};
let privateDir;
const projects = [];
const evidence = path.join(root, "docs/improvements/phase-3/evidence/phase-3b");
const secrets = [];
function redact(value) {
  let result = String(value);
  for (const secret of secrets)
    result = result.split(secret).join("[REDACTED]");
  return result;
}
function run(args, options = {}) {
  const result = spawnSync("docker", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    timeout: 180000,
    maxBuffer: 8 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0)
    throw new Error(
      redact(
        `docker ${args[0]} failed (${result.status}): ${result.stderr || result.stdout || result.error}`,
      ),
    );
  return result.stdout.trim();
}
function record(name, detail = {}) {
  report.steps.push({
    name,
    status: "passed",
    at: new Date().toISOString(),
    ...detail,
  });
  console.log(`PASS ${name}`);
}
function compose(p, ...args) {
  return run(
    [
      "compose",
      "--project-name",
      p.name,
      "--env-file",
      p.envFile,
      "-f",
      "docker-compose.prod.yml",
      "-f",
      p.override,
      ...args,
    ],
    { env: p.env },
  );
}
function inspect(p, service) {
  const id = compose(p, "ps", "-a", "-q", service);
  assert.match(id, /^[a-f0-9]{64}$/);
  const container = JSON.parse(run(["inspect", id]))[0];
  assert.equal(container.Config.Labels["com.docker.compose.project"], p.name);
  return container;
}
function exec(p, service, args, input) {
  inspect(p, service); // Assert project ownership before every mutation/probe.
  return run(
    [
      "compose",
      "--project-name",
      p.name,
      "--env-file",
      p.envFile,
      "-f",
      "docker-compose.prod.yml",
      "-f",
      p.override,
      "exec",
      "-T",
      service,
      ...args,
    ],
    { env: p.env, input },
  );
}
function sql(p, user, query) {
  return exec(
    p,
    "postgres",
    [
      "psql",
      "-X",
      "-U",
      user,
      "-d",
      "atlas_phase3b_test",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
    ],
    query,
  );
}
function override(p, images) {
  p.images = images;
  // JSON is YAML-compatible; !reset needed only for the inherited edge port.
  fs.writeFileSync(
    p.override,
    `services:\n  migrate:\n    image: ${images.api}\n    pull_policy: never\n  api:\n    image: ${images.api}\n    pull_policy: never\n    restart: "no"\n  web:\n    image: ${images.web}\n    pull_policy: never\n    restart: "no"\n  nginx:\n    ports: !reset []\n    restart: "no"\n  tls:\n    ports: !reset []\n  postgres:\n    restart: "no"\n  redis:\n    restart: "no"\n  rabbitmq:\n    restart: "no"\nnetworks:\n  default:\n    internal: true\n`,
  );
}
function freshProject(suffix, envText, images) {
  const name = `atlas-phase3b-${suffix}-${randomBytes(5).toString("hex")}`;
  assert.equal(
    run([
      "ps",
      "-a",
      "-q",
      "--filter",
      `label=com.docker.compose.project=${name}`,
    ]),
    "",
  );
  assert.equal(
    run([
      "volume",
      "ls",
      "-q",
      "--filter",
      `label=com.docker.compose.project=${name}`,
    ]),
    "",
  );
  assert.equal(
    run([
      "network",
      "ls",
      "-q",
      "--filter",
      `label=com.docker.compose.project=${name}`,
    ]),
    "",
  );
  const p = {
    name,
    envFile: path.join(privateDir, `${suffix}.env`),
    override: path.join(privateDir, `${suffix}.yaml`),
    env: { ...process.env },
  };
  for (const key of Object.keys(p.env))
    if (
      /^(COMPOSE_|POSTGRES_|DATABASE_|RABBITMQ_|JWT_|AUTH_PROXY_|STORAGE_|CORS_|SITE_DOMAIN$|ACME_EMAIL$)/.test(
        key,
      )
    )
      delete p.env[key];
  fs.writeFileSync(p.envFile, envText, { mode: 0o600 });
  override(p, images);
  const config = JSON.parse(compose(p, "config", "--format", "json"));
  assert.equal(config.networks.default.internal, true);
  for (const service of Object.values(config.services))
    assert.equal((service.ports || []).length, 0);
  for (const volume of Object.values(config.volumes)) {
    assert.equal(Boolean(volume.external), false);
    assert.ok(volume.name.startsWith(`${name}_`));
  }
  const apiEnv = config.services.api.environment;
  const owner = new URL(config.services.migrate.environment.DATABASE_URL);
  const app = new URL(apiEnv.DATABASE_URL);
  assert.equal(app.hostname, "postgres");
  assert.equal(app.pathname, "/atlas_phase3b_test");
  assert.equal(app.username, "atlas_app");
  assert.notEqual(app.password, owner.password);
  assert.equal(apiEnv.NODE_ENV, "production");
  assert.equal(apiEnv.STORAGE_RETENTION_ENABLED, "false");
  assert.equal(
    new Set([
      apiEnv.JWT_SECRET,
      apiEnv.JWT_REFRESH_SECRET,
      apiEnv.AUTH_PROXY_SECRET,
    ]).size,
    3,
  );
  projects.push(p);
  return p;
}
async function ready(p) {
  for (let i = 0; i < 90; i++) {
    try {
      exec(p, "api", [
        "node",
        "-e",
        "Promise.all(['http://nginx/api/health','http://nginx/login'].map(url=>fetch(url,{signal:AbortSignal.timeout(3000)}))).then(r=>process.exit(r.every(x=>x.ok)?0:1)).catch(()=>process.exit(1))",
      ]);
      return;
    } catch {
      await pause(1000);
    }
  }
  throw new Error(`${p.name}: readiness deadline exceeded`);
}
function isolation(p) {
  const network = JSON.parse(
    run(["network", "inspect", `${p.name}_default`]),
  )[0];
  assert.equal(network.Internal, true);
  for (const service of [
    "api",
    "web",
    "nginx",
    "postgres",
    "redis",
    "rabbitmq",
  ]) {
    const c = inspect(p, service);
    assert.deepEqual(Object.keys(c.NetworkSettings.Networks), [
      `${p.name}_default`,
    ]);
    assert.ok(
      Object.values(c.HostConfig.PortBindings || {}).every((v) => !v?.length),
    );
    for (const mount of c.Mounts.filter((m) => m.Type === "volume"))
      assert.ok(mount.Name.startsWith(`${p.name}_`));
    if (["api", "web"].includes(service)) {
      assert.equal(c.Config.User, "node");
      assert.equal(c.Image, p.images[service]);
    }
  }
  record(`${p.name}: resource isolation`);
}
function privileges(p) {
  sql(
    p,
    "atlas_app",
    fs.readFileSync(
      path.join(root, "scripts/database/verify-runtime-role.sql"),
      "utf8",
    ),
  );
  const probes = [
    "CREATE TABLE public.phase3b_forbidden(id int)",
    'ALTER TABLE public."Tenant" ADD COLUMN phase3b_forbidden int',
    'TRUNCATE public."Tenant" CASCADE',
    'DELETE FROM public."AuditLog" WHERE false',
    'UPDATE public."AuditLog" SET action=action WHERE false',
    'DELETE FROM public."ExportTask" WHERE false',
    "SELECT * FROM public._prisma_migrations",
    "SET ROLE atlas_owner",
  ];
  // Each denied operation is trapped in a PL/pgSQL subtransaction and checked for 42501.
  // Unexpected success raises, rolling the entire outer transaction back.
  for (const probe of probes) {
    sql(
      p,
      "atlas_app",
      `BEGIN; DO $gate$ BEGIN BEGIN EXECUTE '${probe.replaceAll("'", "''")}'; EXCEPTION WHEN insufficient_privilege THEN RETURN; END; RAISE EXCEPTION 'Privilege probe unexpectedly succeeded'; END $gate$; ROLLBACK;`,
    );
  }
  const extras = sql(
    p,
    "atlas_app",
    `SELECT count(*) FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname <> 'information_schema' AND has_schema_privilege(oid,'CREATE'); SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND CASE WHEN c.relkind='S' THEN has_sequence_privilege(c.oid,'USAGE,SELECT,UPDATE') ELSE false END;`,
  );
  assert.equal(extras.replaceAll("\r", ""), "0\n0");
  record(`${p.name}: effective runtime grants and eight denied operations`);
}
function copyProbe(p) {
  compose(
    p,
    "cp",
    "scripts/security/phase3b-smoke.cjs",
    "api:/tmp/phase3b-smoke.cjs",
  );
  compose(
    p,
    "cp",
    "tests/browser/fixtures/upload.png",
    "api:/tmp/phase3b-upload.png",
  );
}
function smoke(p, mode) {
  copyProbe(p);
  if (mode !== "seed")
    compose(
      p,
      "cp",
      path.join(privateDir, "fixture.json"),
      "api:/tmp/phase3b-fixture.json",
    );
  const output = exec(p, "api", ["node", "/tmp/phase3b-smoke.cjs", mode]);
  record(`${p.name}: ${mode} smoke`, JSON.parse(output));
  if (mode === "seed")
    compose(
      p,
      "cp",
      "api:/tmp/phase3b-fixture.json",
      path.join(privateDir, "fixture.json"),
    );
}
function databaseManifest(p) {
  const tables = [
    "Tenant",
    "User",
    "TenantUser",
    "Category",
    "Content",
    "Media",
    "AuditLog",
    "ExportTask",
    "_prisma_migrations",
  ];
  return Object.fromEntries(
    tables.map((table) => {
      const rows = sql(
        p,
        "atlas_owner",
        `SELECT row_to_json(t)::text FROM public."${table}" t ORDER BY id;`,
      );
      return [
        table,
        { rows: rows ? rows.split("\n").length : 0, sha256: hash(rows) },
      ];
    }),
  );
}
function vaultManifest(p) {
  return JSON.parse(
    exec(p, "api", [
      "node",
      "-e",
      `const fs=require('fs'),path=require('path'),crypto=require('crypto');const result={};function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(item.isFile())result[file]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');else throw Error('Unexpected vault entry');}}walk('storage');console.log(JSON.stringify(result));`,
    ]),
  );
}
async function main() {
  const preflight = process.argv[2] === "--preflight";
  assert.ok(
    process.argv.length === 3 &&
      (preflight || process.argv[2] === "--approved-isolated-local"),
    "Use --preflight, or --approved-isolated-local only after approval of a NEW isolated local synthetic drill",
  );
  assert.equal(
    process.env.DOCKER_HOST,
    undefined,
    "DOCKER_HOST override is not allowed for a local-only drill",
  );
  const endpoint = run([
    "context",
    "inspect",
    "--format",
    "{{.Endpoints.docker.Host}}",
  ]);
  assert.match(
    endpoint,
    /^(npipe:\/\/|unix:\/\/)/,
    "Local Docker socket required; remote Docker is forbidden",
  );
  report.dockerEndpointKind = endpoint.startsWith("npipe:")
    ? "local named pipe"
    : "local unix socket";
  const images = {};
  const previous = {};
  for (const service of ["api", "web"]) {
    if (preflight) {
      images[service] = `atlas-${service}:phase3b-candidate`;
      previous[service] = `atlas-${service}:security-phase2`;
      continue;
    }
    images[service] = run([
      "image",
      "inspect",
      `atlas-${service}:phase3b-candidate`,
      "--format",
      "{{.Id}}",
    ]);
    previous[service] = run([
      "image",
      "inspect",
      `atlas-${service}:security-phase2`,
      "--format",
      "{{.Id}}",
    ]);
    assert.match(images[service], /^sha256:[a-f0-9]{64}$/);
    assert.match(previous[service], /^sha256:[a-f0-9]{64}$/);
  }
  report.images = { candidate: images, previous };
  report.existingContainers = run([
    "ps",
    "-a",
    "--format",
    "{{.ID}}|{{.Names}}|{{.Image}}",
  ]).split("\n");
  privateDir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-phase3b-"));
  const secret = () => {
    const value = randomBytes(32).toString("hex");
    secrets.push(value);
    return value;
  };
  const appPassword = secret();
  const envText = `POSTGRES_USER=atlas_owner\nPOSTGRES_DB=atlas_phase3b_test\nPOSTGRES_PASSWORD=${secret()}\nDATABASE_APP_URL=postgresql://atlas_app:${appPassword}@postgres:5432/atlas_phase3b_test?schema=public\nRABBITMQ_USER=atlas_drill\nRABBITMQ_PASS=${secret()}\nJWT_SECRET=${secret()}\nJWT_REFRESH_SECRET=${secret()}\nAUTH_PROXY_SECRET=${secret()}\nSTORAGE_ENCRYPTION_KEY=${secret()}\nSTORAGE_RETENTION_ENABLED=false\nCORS_ORIGINS=http://nginx\n`;
  const source = freshProject("source", envText, images);
  record("fresh project config, secrets separation, no published ports");
  if (preflight) {
    report.status = "preflight-passed-runtime-not-executed";
    report.unverified = [
      "production-mode startup",
      "effective DB privileges",
      "tenant isolation",
      "backup/restore",
      "deployment rollback",
    ];
    return;
  }
  source.started = true;
  compose(
    source,
    "up",
    "-d",
    "--no-build",
    "--wait",
    "postgres",
    "redis",
    "rabbitmq",
  );
  compose(source, "run", "--rm", "--no-deps", "migrate");
  const provision = fs
    .readFileSync(
      path.join(root, "scripts/database/create-runtime-role.sql"),
      "utf8",
    )
    .replace(
      "\\getenv app_password ATLAS_APP_PASSWORD",
      `\\set app_password '${appPassword}'`,
    );
  sql(source, "atlas_owner", provision);
  privileges(source);
  compose(source, "up", "-d", "--no-build", "--no-deps", "api", "web", "nginx");
  await ready(source);
  isolation(source);
  smoke(source, "seed");
  const migrationBefore = databaseManifest(source)._prisma_migrations;
  const rollbackStart = Date.now();
  compose(source, "stop", "nginx", "web", "api");
  override(source, previous);
  compose(source, "up", "-d", "--no-build", "--no-deps", "api", "web", "nginx");
  await ready(source);
  isolation(source);
  privileges(source);
  smoke(source, "verify");
  assert.deepEqual(
    databaseManifest(source)._prisma_migrations,
    migrationBefore,
  );
  record("coordinated rollback to previous API/web IDs; schema unchanged", {
    seconds: (Date.now() - rollbackStart) / 1000,
  });
  compose(source, "stop", "nginx", "web", "api");
  override(source, images);
  compose(source, "up", "-d", "--no-build", "--no-deps", "api", "web", "nginx");
  await ready(source);
  smoke(source, "verify");
  const sourceVault = vaultManifest(source);
  assert.ok(Object.keys(sourceVault).length >= 2);
  report.vaultManifest = sourceVault;
  compose(source, "stop", "nginx", "web", "api");
  const sourceManifest = databaseManifest(source);
  report.databaseManifest = sourceManifest;
  const backupStart = Date.now();
  exec(source, "postgres", [
    "pg_dump",
    "-U",
    "atlas_owner",
    "-d",
    "atlas_phase3b_test",
    "-Fc",
    "-f",
    "/tmp/phase3b.dump",
  ]);
  compose(
    source,
    "cp",
    "postgres:/tmp/phase3b.dump",
    path.join(privateDir, "database.dump"),
  );
  const storageVolume = `${source.name}_api_storage`;
  const backupHelper = `${source.name}-backup`;
  run([
    "run",
    "--name",
    backupHelper,
    "--network",
    "none",
    "--mount",
    `type=volume,source=${storageVolume},target=/storage,readonly`,
    "--mount",
    `type=bind,source=${privateDir},target=/backup`,
    "postgres:15-alpine",
    "tar",
    "-cf",
    "/backup/storage.tar",
    "-C",
    "/storage",
    ".",
  ]);
  record("quiesced DB plus encrypted vault backup", {
    seconds: (Date.now() - backupStart) / 1000,
    databaseSha256: hash(
      fs.readFileSync(path.join(privateDir, "database.dump")),
    ),
    vaultSha256: hash(fs.readFileSync(path.join(privateDir, "storage.tar"))),
  });
  compose(source, "stop", "postgres", "redis", "rabbitmq");
  const restoreStart = Date.now();
  // Simulate config/key recovery from the saved private file, rather than process memory.
  const restored = freshProject(
    "restore",
    fs.readFileSync(source.envFile, "utf8"),
    images,
  );
  restored.started = true;
  compose(
    restored,
    "up",
    "-d",
    "--no-build",
    "--wait",
    "postgres",
    "redis",
    "rabbitmq",
  );
  assert.equal(
    sql(
      restored,
      "atlas_owner",
      "SELECT count(*) FROM pg_tables WHERE schemaname='public';",
    ),
    "0",
  );
  // Roles are cluster-global and are not part of pg_dump; recreate the restricted identity first.
  sql(
    restored,
    "atlas_owner",
    `CREATE ROLE atlas_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${appPassword}'; GRANT CONNECT ON DATABASE atlas_phase3b_test TO atlas_app;`,
  );
  compose(
    restored,
    "cp",
    path.join(privateDir, "database.dump"),
    "postgres:/tmp/phase3b.dump",
  );
  exec(restored, "postgres", [
    "pg_restore",
    "-U",
    "atlas_owner",
    "-d",
    "atlas_phase3b_test",
    "--exit-on-error",
    "--single-transaction",
    "/tmp/phase3b.dump",
  ]);
  assert.deepEqual(databaseManifest(restored), sourceManifest);
  privileges(restored);
  // create allocates only this fresh project's volume; the application has not started.
  compose(restored, "up", "--no-start", "--no-build", "--no-deps", "api");
  run([
    "run",
    "--name",
    `${restored.name}-vault`,
    "--network",
    "none",
    "--mount",
    `type=volume,source=${restored.name}_api_storage,target=/storage`,
    "--mount",
    `type=bind,source=${privateDir},target=/backup,readonly`,
    "postgres:15-alpine",
    "sh",
    "-ec",
    'test -z "$(find /storage -type f -print -quit)"; tar -xf /backup/storage.tar -C /storage',
  ]);
  compose(
    restored,
    "up",
    "-d",
    "--no-build",
    "--no-deps",
    "api",
    "web",
    "nginx",
  );
  await ready(restored);
  isolation(restored);
  assert.deepEqual(vaultManifest(restored), sourceVault);
  smoke(restored, "verify");
  exec(restored, "api", [
    "node",
    "-e",
    `const assert=require('assert/strict'),fs=require('fs'),crypto=require('crypto');const {FileVaultService}=require('./dist/modules/storage/file-vault.service');const fixture=JSON.parse(fs.readFileSync('/tmp/phase3b-fixture.json','utf8'));delete process.env.STORAGE_ENCRYPTION_KEY;assert.throws(()=>new FileVaultService(),/required in production/);process.env.STORAGE_ENCRYPTION_KEY=crypto.randomBytes(32).toString('hex');assert.rejects(()=>new FileVaultService().read(fixture.file)).then(()=>console.log('Missing key and wrong key both rejected')).catch(()=>process.exit(1));`,
  ]);
  record("missing and incorrect encryption key negative controls");
  record(
    "restore DB rows, grants, encrypted files, saved key/config and application checks",
    { seconds: (Date.now() - restoreStart) / 1000, syntheticRpoLostRows: 0 },
  );
  report.status = "passed";
}
main()
  .catch((error) => {
    report.status = "failed";
    report.error = redact(error.message);
    console.error(report.error);
    process.exitCode = 1;
  })
  .finally(() => {
    report.projects = projects.map((p) => p.name);
    report.privateArtifacts = privateDir
      ? {
          directory: privateDir,
          warning:
            "Synthetic credentials/config; backup and fixture only when runtime drill executes. Never commit.",
        }
      : "none";
    for (const p of projects) {
      if (!p.started) continue;
      try {
        compose(p, "stop");
      } catch (error) {
        report.cleanupError = redact(error.message);
        report.status = "failed";
        process.exitCode = 1;
      }
    }
    report.finishedAt = new Date().toISOString();
    report.resources = projects.some((p) => p.started)
      ? "Created project containers stopped; all volumes retained; no down -v or database reset."
      : "No runtime containers or volumes created or stopped.";
    fs.mkdirSync(evidence, { recursive: true });
    fs.writeFileSync(
      path.join(evidence, `drill-${Date.now()}.json`),
      JSON.stringify(report, null, 2) + "\n",
    );
  });
