// Phase 3E: explicit synthetic fixture; does not load user .env files.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../../../../..");
const npmCli = path.join(
  process.env.APPDATA,
  "npm/node_modules/npm/bin/npm-cli.js",
);
const checks = {
  unit: [
    "run",
    "test:cov",
    "--workspace=@atlas/api",
    "--",
    "--runInBand",
    "--coverageReporters=json-summary",
    "--coverageReporters=text",
  ],
  security: ["run", "test:security"],
  lintApi: ["run", "lint", "--workspace=@atlas/api"],
  lintWeb: ["run", "lint", "--workspace=@atlas/web-admin"],
  typesApi: [
    "exec",
    "--workspace=@atlas/api",
    "--",
    "tsc",
    "--noEmit",
    "--incremental",
    "false",
  ],
  typesWeb: [
    "exec",
    "--workspace=@atlas/web-admin",
    "--",
    "tsc",
    "--noEmit",
    "--incremental",
    "false",
  ],
  format: ["run", "format:check:reliability"],
  auditRuntime: ["audit", "--omit=dev", "--audit-level=moderate", "--json"],
  auditAll: ["audit", "--json"],
  integration: ["run", "test:int", "--workspace=@atlas/api"],
  e2e: ["run", "test:e2e", "--workspace=@atlas/api"],
  grants: ["run", "test:security:db"],
  generate: ["run", "prisma:generate", "--workspace=@atlas/api"],
  migrate: [
    "exec",
    "--workspace=@atlas/api",
    "--",
    "prisma",
    "migrate",
    "deploy",
  ],
  migrationStatus: [
    "exec",
    "--workspace=@atlas/api",
    "--",
    "prisma",
    "migrate",
    "status",
  ],
  buildApi: ["run", "build", "--workspace=@atlas/api"],
  buildWeb: ["run", "build", "--workspace=@atlas/web-admin"],
  browser: ["run", "test:browser", "--", "--retries=0"],
};
const name = process.argv[2];
if (!checks[name] || !fs.existsSync(npmCli))
  throw new Error("Unknown check or missing npm CLI");
const env = {
  ...process.env,
  DATABASE_URL:
    "postgresql://atlas_test:atlas_test@127.0.0.1:55432/atlas_test?schema=public",
  REDIS_URL: "redis://127.0.0.1:56379",
  RABBITMQ_URL: "amqp://guest:guest@127.0.0.1:55672",
  QUEUE_NAME: "phase3e_test_exports",
  JWT_SECRET: "phase3e-test-access-secret-not-production",
  JWT_REFRESH_SECRET: "phase3e-test-refresh-secret-not-production",
  AUTH_PROXY_SECRET: "phase3e-test-proxy-secret-not-production",
  STORAGE_ENCRYPTION_KEY: "1".repeat(64),
  STORAGE_RETENTION_ENABLED: "false",
  STORAGE_RETENTION_DRY_RUN: "true",
  API_URL: "http://127.0.0.1:4400/api",
  NODE_ENV: name.startsWith("build") ? "production" : "test",
};
delete env.DATABASE_APP_URL;
delete env.CI;
if (["grants", "browser"].includes(name))
  env.DATABASE_APP_URL =
    "postgresql://atlas_app:phase3e-test-runtime-password-not-production@127.0.0.1:55432/atlas_test?schema=public";
if (name === "browser") env.CI = "1";
// Prevent cleanup suites from reaching any pre-existing stack on these ports.
if (
  [
    "integration",
    "e2e",
    "grants",
    "migrate",
    "migrationStatus",
    "browser",
  ].includes(name)
) {
  const ids = JSON.parse(
    fs.readFileSync(path.join(__dirname, "fixture.json"), "utf8"),
  );
  for (const saved of ids) {
    const result = spawnSync("docker", ["inspect", saved.id], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.status !== 0) throw new Error("Fixture unavailable");
    const [c] = JSON.parse(result.stdout);
    if (
      c.Id !== saved.id ||
      !c.State.Running ||
      c.Config.Labels["com.docker.compose.project"] !== "atlas-phase3e-review"
    )
      throw new Error("Fixture ownership mismatch");
    if (
      saved.service === "postgres" &&
      !Object.hasOwn(c.HostConfig.Tmpfs || {}, "/var/lib/postgresql/data")
    )
      throw new Error("Database must be tmpfs");
    const expected = {
      postgres: ["5432/tcp", "55432"],
      redis: ["6379/tcp", "56379"],
      rabbitmq: ["5672/tcp", "55672"],
    }[saved.service];
    const binding = c.NetworkSettings.Ports[expected[0]];
    if (
      binding?.length !== 1 ||
      binding[0].HostIp !== "127.0.0.1" ||
      binding[0].HostPort !== expected[1]
    )
      throw new Error("Fixture port mismatch");
  }
}
const started = Date.now();
let command = [npmCli, ...checks[name]];
if (name === "e2e") {
  if (fs.existsSync(path.join(root, "apps/api/test/e2e/test-image.png")))
    throw new Error("Refusing to overwrite existing test image");
  const config = JSON.parse(
    fs.readFileSync(path.join(root, "apps/api/test/jest-e2e.json"), "utf8"),
  );
  config.rootDir = path.join(root, "apps/api/test");
  config.setupFiles = [path.join(__dirname, "isolate-vault.cjs")];
  config.transform = {
    "^.+\\.(t|j)s$": [
      require.resolve("ts-jest", { paths: [path.join(root, "apps/api")] }),
      { tsconfig: path.join(root, "apps/api/tsconfig.json") },
    ],
  };
  command = [
    require.resolve("jest/bin/jest", { paths: [path.join(root, "apps/api")] }),
    "--config",
    JSON.stringify(config),
    "--runInBand",
  ];
}
const result = spawnSync(process.execPath, command, {
  cwd: root,
  env,
  encoding: "utf8",
  windowsHide: true,
  timeout: 900000,
  maxBuffer: 30 * 1024 * 1024,
});
const output = (result.stdout || "") + (result.stderr || "");
fs.writeFileSync(path.join(__dirname, `${name}.log`), output);
const summary = {
  name,
  command: ["node", ...command],
  node: process.version,
  exitCode: result.status,
  error: result.error?.message,
  durationMs: Date.now() - started,
  finishedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(__dirname, `${name}.json`),
  JSON.stringify(summary, null, 2),
);
if (name === "unit" && result.status === 0)
  fs.copyFileSync(
    path.join(root, "apps/api/coverage/coverage-summary.json"),
    path.join(__dirname, "coverage.json"),
  );
if (name === "auditAll" && [0, 1].includes(result.status)) {
  const report = JSON.parse(result.stdout);
  const { reviewAudit } = require(
    path.join(root, "scripts/security/dependency-policy.cjs"),
  );
  const failures = reviewAudit(
    report,
    JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8")),
  );
  fs.writeFileSync(
    path.join(__dirname, "audit-policy.json"),
    JSON.stringify(
      { counts: report.metadata.vulnerabilities, failures },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ auditExitCode: result.status, policyFailures: failures }),
  );
}
console.log(JSON.stringify(summary));
if (result.status !== 0) console.log(output.slice(-4000));
process.exitCode = result.status ?? 1;
