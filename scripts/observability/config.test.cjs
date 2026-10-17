const { test } = require("node:test");
const assert = require("node:assert/strict");
const cp = require("node:child_process");
const path = require("node:path");
test("monitoring ports stay on loopback, API metrics stay private, broker data mounts survive merge", () => {
  const root = path.resolve(__dirname, "../..");
  const env = {
    ...process.env,
    POSTGRES_USER: "atlas_owner",
    POSTGRES_PASSWORD: "synthetic-owner",
    POSTGRES_DB: "atlas_test",
    DATABASE_APP_URL:
      "postgresql://atlas_app:synthetic-app@postgres:5432/atlas_test",
    RABBITMQ_PASS: "synthetic-broker",
    JWT_SECRET: "synthetic-access",
    JWT_REFRESH_SECRET: "synthetic-refresh",
    AUTH_PROXY_SECRET: "synthetic-proxy",
    STORAGE_ENCRYPTION_KEY: "1".repeat(64),
    GRAFANA_ADMIN_PASSWORD: "synthetic-grafana-not-production",
  };
  const config = JSON.parse(
    cp.execFileSync(
      "docker",
      [
        "compose",
        "-f",
        "docker-compose.prod.yml",
        "-f",
        "docker-compose.observability.yml",
        "config",
        "--format",
        "json",
      ],
      { cwd: root, encoding: "utf8", env },
    ),
  );
  assert.equal(config.services.api.ports, undefined);
  for (const name of ["prometheus", "alertmanager", "grafana"])
    for (const binding of config.services[name].ports)
      assert.equal(binding.host_ip, "127.0.0.1");
  assert.equal(config.services["alert-journal"].ports, undefined);
  assert.equal(
    config.services.grafana.environment.GF_AUTH_ANONYMOUS_ENABLED,
    "false",
  );
  assert.equal(
    config.services.grafana.environment.GF_USERS_ALLOW_SIGN_UP,
    "false",
  );
  assert.ok(
    config.services.rabbitmq.volumes.some(
      (v) =>
        v.type === "volume" &&
        v.target === "/var/lib/rabbitmq" &&
        v.source === "rabbitmq_data_prod",
    ),
  );
  assert.ok(
    config.services.rabbitmq.volumes.some(
      (v) =>
        v.type === "bind" &&
        v.target === "/etc/rabbitmq/enabled_plugins" &&
        v.read_only,
    ),
  );
  assert.equal(
    config.services.api.environment.DATABASE_URL,
    env.DATABASE_APP_URL,
  );
  assert.equal(
    config.services.api.environment.STORAGE_RETENTION_ENABLED,
    "false",
  );
});
