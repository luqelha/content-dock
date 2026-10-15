const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, responses) {
  const calls = [];
  const context = {
    exports: {},
    URL,
    Set,
    Response,
    process: { env: { API_URL: "http://isolated.test/api" } },
    console: { error: () => {} },
    require(name) {
      if (name === "react") return require("react");
      if (name === "next/headers")
        return {
          cookies: async () => ({
            get: (name) => ({
              value: name === "access_token" ? "test-token" : "tenant-1",
            }),
          }),
        };
      if (name === "next/cache") return { revalidatePath() {} };
      if (name.endsWith("/files")) return { privateFileUrl: (value) => value };
      throw new Error("Unexpected import: " + name);
    },
    fetch: async (...args) => {
      calls.push(args);
      return responses.shift();
    },
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        path.join(__dirname, "../../apps/web-admin/src", file),
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    context,
  );
  return { api: context.exports, calls };
}
const response = (status, body = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

test("API list failures remain errors instead of empty data", async () => {
  for (const name of [
    "fetchTenants",
    "fetchAnalytics",
    "fetchCategories",
    "fetchContents",
    "fetchMedia",
  ]) {
    for (const status of [401, 403, 500]) {
      const { api } = load("lib/api.ts", [response(status)]);
      await assert.rejects(
        api[name]("token", "tenant"),
        (e) => e.name === "ApiError" && e.status === status,
      );
    }
  }
});
test("detail not-found and expired profile retain their intended semantics", async () => {
  const { api } = load("lib/api.ts", [
    response(404),
    response(500),
    response(401),
    response(503),
  ]);
  assert.equal(await api.getContent("token", "tenant", "content"), null);
  await assert.rejects(
    api.getContent("token", "tenant", "content"),
    (e) => e.status === 500,
  );
  assert.equal(await api.fetchProfile("token"), null);
  await assert.rejects(api.fetchProfile("token"), (e) => e.status === 503);
});
test("bulk delete reports exact successful and failed IDs for retry", async () => {
  const { api } = load("actions/media.ts", [response(200), response(403)]);
  const result = await api.deleteMultipleMedia(["success-id", "failed-id"]);
  assert.equal(result.success, false);
  assert.deepEqual(Array.from(result.deletedIds), ["success-id"]);
  assert.deepEqual(Array.from(result.failedIds), ["failed-id"]);
  assert.equal(result.deletedCount, 1);
  assert.equal(result.failedCount, 1);
});
test("content category unset is serialized as explicit null", async () => {
  const { api, calls } = load("actions/contents.ts", [
    response(200, { categoryId: null }),
  ]);
  const result = await api.updateContent("content-1", { categoryId: null });
  assert.equal(result.success, true);
  assert.deepEqual(JSON.parse(calls[0][1].body), { categoryId: null });
});
