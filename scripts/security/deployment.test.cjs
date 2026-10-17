const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { createRequire } = require("node:module");
const path = require("node:path");
const fs = require("node:fs");
const root = path.resolve(__dirname, "../..");

test("every published development infrastructure port binds only to IPv4 loopback", () => {
  const config = JSON.parse(
    execFileSync(
      "docker",
      ["compose", "-f", "docker-compose.yml", "config", "--format", "json"],
      { cwd: root, encoding: "utf8" },
    ),
  );
  let count = 0;
  for (const service of Object.values(config.services)) {
    for (const port of service.ports || []) {
      count++;
      assert.equal(port.host_ip, "127.0.0.1");
    }
  }
  assert.equal(count, 4);
});

test("production separates API runtime credentials from migration/bootstrap credentials", () => {
  const env = {
    ...process.env,
    POSTGRES_USER: "atlas_owner",
    POSTGRES_PASSWORD: "test-owner-password",
    POSTGRES_DB: "atlas_test",
    DATABASE_APP_URL:
      "postgresql://atlas_app:test-app-password@postgres:5432/atlas_test?schema=public",
    RABBITMQ_PASS: "test",
    JWT_SECRET: "test",
    JWT_REFRESH_SECRET: "test",
    AUTH_PROXY_SECRET: "phase2-compose-auth-proxy-test-secret",
    STORAGE_ENCRYPTION_KEY: "0".repeat(64),
  };
  const config = JSON.parse(
    execFileSync(
      "docker",
      [
        "compose",
        "-f",
        "docker-compose.prod.yml",
        "config",
        "--format",
        "json",
      ],
      { cwd: root, encoding: "utf8", env },
    ),
  );
  const api = new URL(config.services.api.environment.DATABASE_URL);
  const owner = new URL(config.services.migrate.environment.DATABASE_URL);
  assert.equal(api.username, "atlas_app");
  assert.equal(owner.username, env.POSTGRES_USER);
  assert.notEqual(api.password, owner.password);
  assert.equal(api.pathname, owner.pathname);
  for (const name of ["postgres", "redis", "rabbitmq", "api"])
    assert.equal(config.services[name].ports, undefined);
});

test("resolved and locked security dependencies meet the reviewed versions", () => {
  const api = createRequire(path.join(root, "apps/api/package.json"));
  const platform = createRequire(api.resolve("@nestjs/platform-express"));
  assert.equal(api("compression/package.json").version, "1.8.2");
  assert.equal(api("multer/package.json").version, "2.4.0");
  assert.equal(platform("multer/package.json").version, "2.4.0");
  assert.equal(require("next/package.json").version, "16.3.8");
  const eslintManifest = path.join(
    path.dirname(require.resolve("eslint-config-next")),
    "../package.json",
  );
  assert.equal(
    JSON.parse(fs.readFileSync(eslintManifest, "utf8")).version,
    "16.3.8",
  );
  const lock = JSON.parse(
    fs.readFileSync(path.join(root, "package-lock.json"), "utf8"),
  );
  const versions = { next: "16.3.8", compression: "1.8.2", multer: "2.4.0" };
  for (const [location, entry] of Object.entries(lock.packages)) {
    for (const [name, version] of Object.entries(versions)) {
      if (
        location.endsWith(`/node_modules/${name}`) ||
        location === `node_modules/${name}`
      )
        assert.equal(entry.version, version, location);
    }
  }
});

test("Nginx auth limiter matches equivalent route spellings", () => {
  const config = fs.readFileSync(path.join(root, "nginx/nginx.conf"), "utf8");
  const location = config.match(
    /location\s+~\*\s+(\S+)\s*\{\s*limit_req zone=auth/,
  );
  assert.ok(location, "Auth location must use a case-insensitive match");
  const pattern = new RegExp(location[1], "i");
  for (const url of [
    "/api/auth/login",
    "/api/auth/login/",
    "/api/AUTH/LOGIN",
    "/api/auth/register/",
  ]) {
    assert.ok(pattern.test(url), url);
  }
});

test("patched Swagger YAML serialization and proxy subnet matching remain compatible", () => {
  const api = createRequire(path.join(root, "apps/api/package.json"));
  const swagger = createRequire(api.resolve("@nestjs/swagger"));
  const yaml = swagger("js-yaml");
  const document = {
    openapi: "3.0.0",
    info: { title: "Regression", version: "1" },
    paths: {},
  };
  assert.deepEqual(
    yaml.load(yaml.dump(document, { skipInvalid: true, noRefs: true })),
    document,
  );
  const proxy = createRequire(api.resolve("@nestjs/platform-express"))(
    "proxy-addr",
  );
  assert.equal(proxy.compile("::ffff:10.0.0.0/8")("203.0.113.5"), false);
  assert.equal(proxy.compile("10.0.0.0/8")("10.1.2.3"), true);
});

test("bootstrap resolves Nest optional peers and RabbitMQ dependencies from the API workspace", async () => {
  const api = createRequire(path.join(root, "apps/api/package.json"));
  const core = createRequire(api.resolve("@nestjs/core"));
  const common = createRequire(api.resolve("@nestjs/common"));
  const microservices = createRequire(core.resolve("@nestjs/microservices"));
  const adapter = createRequire(core.resolve("@nestjs/platform-express"));
  assert.equal(
    common.resolve("class-validator"),
    api.resolve("class-validator"),
  );
  assert.equal(
    common.resolve("class-transformer"),
    api.resolve("class-transformer"),
  );
  assert.equal(microservices.resolve("amqplib"), api.resolve("amqplib"));
  assert.equal(
    microservices.resolve("amqp-connection-manager"),
    api.resolve("amqp-connection-manager"),
  );
  assert.equal(
    core("@nestjs/common").HttpException,
    api("@nestjs/common").HttpException,
  );
  assert.equal(
    adapter("@nestjs/common").HttpException,
    api("@nestjs/common").HttpException,
  );
  class BootstrapModule {}
  api("@nestjs/common").Module({})(BootstrapModule);
  const app = await api("@nestjs/core").NestFactory.create(BootstrapModule, {
    logger: false,
  });
  try {
    // Construct the same HTTP + RMQ framework stack without connecting to a broker.
    app.connectMicroservice({
      transport: api("@nestjs/microservices").Transport.RMQ,
      options: {
        urls: ["amqp://127.0.0.1:1"],
        queue: "isolated-bootstrap-test",
      },
    });
    assert.equal(app.getMicroservices().length, 1);
  } finally {
    await app.close();
  }
});
