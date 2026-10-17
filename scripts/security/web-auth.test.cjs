const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise real Server Action code with isolated framework/network boundaries.
// This is not a browser or Next request-pipeline test.
function loadActions(response, referer = null) {
  const cookies = new Map([["access_token", "old-token"]]);
  const writes = [];
  const calls = [];
  const modules = {
    "@/lib/auth-validation": loadAuthValidation(),
    "@/lib/auth-client-headers": { authClientHeaders: () => ({}) },
    "next/headers": {
      cookies: async () => ({
        get: (name) => ({ value: cookies.get(name) }),
        set: (...args) => writes.push(args),
        delete: (name) => cookies.delete(name),
      }),
      headers: async () => ({ get: () => referer }),
    },
    "next/navigation": {
      redirect: (url) => {
        throw new Error(`REDIRECT:${url}`);
      },
    },
  };
  const context = {
    exports: {},
    require: (name) => {
      assert.ok(modules[name], `Unexpected module ${name}`);
      return modules[name];
    },
    process: {
      env: { NODE_ENV: "production", API_URL: "http://isolated.test/api" },
    },
    fetch: async (...args) => {
      calls.push(args);
      return response;
    },
    console: { error: () => {} },
    URL,
    AbortSignal,
  };
  const source = fs.readFileSync(
    path.join(__dirname, "../../apps/web-admin/src/actions/auth.ts"),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(compiled, context, { filename: "auth-actions.js" });
  return { actions: context.exports, calls, writes, cookies };
}

function loadAuthValidation() {
  const context = { exports: {}, URL, TextEncoder };
  const source = fs.readFileSync(
    path.join(__dirname, "../../apps/web-admin/src/lib/auth-validation.ts"),
    "utf8",
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    context,
  );
  return context.exports;
}

function form(values) {
  const result = new FormData();
  for (const [name, value] of Object.entries(values)) result.set(name, value);
  return result;
}
const credentials = {
  email: "test@example.com",
  password: "test-only-passphrase",
};

test("successful login preserves tokens, cookie security, and dashboard redirect", async () => {
  const app = loadActions({
    ok: true,
    json: async () => ({ access_token: "access", refresh_token: "refresh" }),
  });
  await assert.rejects(
    app.actions.login(null, form(credentials)),
    /REDIRECT:\/dashboard$/,
  );
  assert.equal(app.calls[0][0], "http://isolated.test/api/auth/login");
  assert.deepEqual(JSON.parse(app.calls[0][1].body), credentials);
  assert.equal(app.writes.length, 2);
  for (const [, , options] of app.writes) {
    assert.equal(options.httpOnly, true);
    assert.equal(options.secure, true);
    assert.equal(options.sameSite, "lax");
    assert.equal(options.path, "/");
  }
});

test("failed authentication including throttling does not issue session cookies", async () => {
  const app = loadActions({
    ok: false,
    status: 429,
    json: async () => ({ message: "Too many attempts" }),
  });
  const result = await app.actions.login(null, form(credentials));
  assert.match(result.error, /wait one minute/);
  assert.equal(app.writes.length, 0);
});

test("successful login clears stale workspace selection before a protected-page redirect", async () => {
  const app = loadActions(
    {
      ok: true,
      json: async () => ({ access_token: "access", refresh_token: "refresh" }),
    },
    "https://atlas.test/login?from=%2Fdashboard%2Fcategories",
  );
  app.cookies.set("atlas_active_tenant_id", "previous-session-workspace");
  await assert.rejects(
    app.actions.login(null, form(credentials)),
    /REDIRECT:\/dashboard\/categories$/,
  );
  assert.equal(app.cookies.has("atlas_active_tenant_id"), false);
});

test("failed login preserves the existing workspace selection", async () => {
  const app = loadActions({
    ok: false,
    json: async () => ({ message: "Invalid credentials" }),
  });
  app.cookies.set("atlas_active_tenant_id", "existing-session-workspace");
  await app.actions.login(null, form(credentials));
  assert.equal(
    app.cookies.get("atlas_active_tenant_id"),
    "existing-session-workspace",
  );
});

test("login validates required fields without a network request", async () => {
  const app = loadActions(null);
  assert.ok((await app.actions.login(null, form({}))).error);
  assert.equal(app.calls.length, 0);
});

test("login rejects an external redirect target", async () => {
  const app = loadActions(
    {
      ok: true,
      json: async () => ({ access_token: "access", refresh_token: "refresh" }),
    },
    "https://atlas.test/login?from=https://external.test",
  );
  await assert.rejects(
    app.actions.login(null, form(credentials)),
    /REDIRECT:\/dashboard$/,
  );
});

test("registration preserves payload and login redirect", async () => {
  const app = loadActions({ ok: true, json: async () => ({}) });
  await assert.rejects(
    app.actions.register(
      null,
      form({ ...credentials, confirmPassword: credentials.password }),
    ),
    /REDIRECT:\/login\?registered=true$/,
  );
  assert.deepEqual(JSON.parse(app.calls[0][1].body), credentials);
  assert.equal(app.writes.length, 0);
});

test("registration rejects password mismatch without calling API", async () => {
  const app = loadActions(null);
  assert.ok(
    (
      await app.actions.register(
        null,
        form({ ...credentials, confirmPassword: "different" }),
      )
    ).error,
  );
  assert.equal(app.calls.length, 0);
});

test("server actions normalize email without changing the password", async () => {
  const app = loadActions({ ok: true });
  const password = "  a unique passphrase  ";
  await assert.rejects(
    app.actions.register(
      null,
      form({
        email: " Test@Example.com ",
        password,
        confirmPassword: password,
      }),
    ),
    /REDIRECT:/,
  );
  assert.deepEqual(JSON.parse(app.calls[0][1].body), {
    email: "test@example.com",
    password,
  });
  assert.equal(app.calls[0][1].cache, "no-store");
  assert.ok(app.calls[0][1].signal);
});

test("invalid, file-valued, and oversized input never reaches authentication API", async () => {
  for (const values of [
    { ...credentials, email: "invalid" },
    { ...credentials, email: "a".repeat(255) + "@example.com" },
    { ...credentials, email: new Blob(["test@example.com"]) },
    { ...credentials, password: new Blob(["password"]) },
    { ...credentials, password: "x".repeat(1025) },
  ]) {
    const app = loadActions(null);
    const result = await app.actions.login(null, form(values));
    assert.ok(result.error);
    assert.equal(app.calls.length, 0);
    assert.equal("password" in result, false);
  }
});

test("registration validates UTF-8 byte limits and confirmation on the server", async () => {
  for (const password of ["x".repeat(14), "x".repeat(73), "🔒".repeat(19)]) {
    const app = loadActions(null);
    const result = await app.actions.register(
      null,
      form({
        ...credentials,
        password,
        confirmPassword: password,
      }),
    );
    assert.ok(result.fieldErrors.password);
    assert.equal(app.calls.length, 0);
    assert.equal(JSON.stringify(result).includes(password), false);
  }
  for (const password of ["x".repeat(15), "x".repeat(72), "🔒".repeat(18)]) {
    const app = loadActions({ ok: true });
    await assert.rejects(
      app.actions.register(
        null,
        form({
          ...credentials,
          password,
          confirmPassword: password,
        }),
      ),
      /REDIRECT:/,
    );
  }
});

test("login retains support for existing shorter passwords", async () => {
  const app = loadActions({ ok: false, status: 401 });
  const result = await app.actions.login(
    null,
    form({ ...credentials, password: "old-pass" }),
  );
  assert.equal(app.calls.length, 1);
  assert.match(result.error, /Email or password is incorrect/);
});

test("upstream errors, invalid JSON, and missing tokens never leak or set cookies", async () => {
  for (const response of [
    {
      ok: false,
      status: 500,
      json: async () => ({ message: ["SQL secret-password"] }),
    },
    {
      ok: false,
      status: 401,
      json: async () => {
        throw new Error("HTML gateway page");
      },
    },
    {
      ok: true,
      json: async () => {
        throw new Error("secret-password");
      },
    },
    { ok: true, json: async () => ({}) },
    {
      ok: true,
      json: async () => ({ access_token: "access", refresh_token: null }),
    },
  ]) {
    const app = loadActions(response);
    const result = await app.actions.login(null, form(credentials));
    assert.equal(typeof result.error, "string");
    assert.doesNotMatch(
      JSON.stringify(result),
      /SQL|secret-password|gateway|access_token|refresh_token/,
    );
    assert.equal(app.writes.length, 0);
  }
});

test("a transport failure is recoverable without exposing credentials", async () => {
  const app = loadActions(null);
  const result = await app.actions.login(null, form(credentials));
  assert.match(result.error, /temporarily unavailable/);
  assert.equal(app.writes.length, 0);
});

test("registration errors are safe and never disclose whether an email exists", async () => {
  for (const status of [400, 409, 429, 500]) {
    const app = loadActions({
      ok: false,
      status,
      json: async () => ({ message: "Email already exists: private" }),
    });
    const result = await app.actions.register(
      null,
      form({ ...credentials, confirmPassword: credentials.password }),
    );
    assert.doesNotMatch(result.error, /already exists|private/);
    assert.equal(app.writes.length, 0);
  }
});

test("redirect validation rejects traversal, backslashes, and malformed Referer", () => {
  const { dashboardDestination } = loadAuthValidation();
  for (const from of [
    "https://evil.test",
    "//evil.test",
    "/dashboard/../../evil",
    "/dashboard/..%2f..%2fevil",
    "/dashboard/\\evil",
    "/dashboard/\nattack",
  ]) {
    const result = dashboardDestination(
      "https://atlas.test/login?from=" + encodeURIComponent(from),
    );
    // Encoded slashes remain a local dashboard path; decoded traversal is rejected.
    assert.ok(result === "/dashboard" || result.startsWith("/dashboard/"));
    assert.doesNotMatch(result, /^\/\/|\\|\n/);
  }
  assert.equal(dashboardDestination("not a URL"), "/dashboard");
  assert.equal(
    dashboardDestination(
      "https://atlas.test/login?from=%2Fdashboard%2Fcontent%3Fpage%3D2",
    ),
    "/dashboard/content?page=2",
  );
});

test("logout calls API and removes all session/workspace cookies", async () => {
  const app = loadActions({ ok: true });
  app.cookies.set("refresh_token", "refresh");
  app.cookies.set("atlas_active_tenant_id", "tenant");
  await assert.rejects(app.actions.logout(), /REDIRECT:\/login$/);
  assert.equal(app.calls[0][1].headers.Authorization, "Bearer old-token");
  assert.equal(app.cookies.size, 0);
});

test("patched native image dependency decodes a benign PNG and AVIF", async () => {
  const sharp = require("sharp");
  for (const format of ["png", "avif"]) {
    const encoded = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "#ffffff" },
    })
      .toFormat(format)
      .toBuffer();
    const decoded = await sharp(encoded)
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(decoded.info.width, 2);
    assert.equal(decoded.info.height, 2);
  }
});
