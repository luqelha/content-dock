const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { loadTypescript } = require("./load-typescript.cjs");
const source = path.resolve(__dirname, "../../apps/web-admin/src");
const contracts = loadTypescript(path.join(source, "lib/contracts.ts"));
const date = "2026-10-01T00:00:00.000Z";
const media = {
  id: "media",
  tenantId: "tenant",
  url: "/uploads/image.png",
  type: "image/png",
  createdAt: date,
};
const profile = {
  id: "user",
  email: "test@example.test",
  firstName: null,
  lastName: null,
  bio: null,
  avatarUrl: null,
  createdAt: date,
  updatedAt: date,
};
const tenant = {
  id: "tenant",
  name: "Workspace",
  role: "ADMIN",
  domain: null,
  createdAt: date,
  updatedAt: date,
};
const response = (body, status = 200) =>
  new Response(JSON.stringify(body), { status });

function boundary(file, responses, token = "token") {
  const calls = [];
  const api = loadTypescript(path.join(source, file), {
    modules: {
      "server-only": {},
      react: { cache: (fn) => fn },
      "next/headers": {
        cookies: async () => ({
          get: (name) => ({
            value: name === "access_token" ? token : "tenant",
          }),
        }),
      },
      "next/cache": { revalidatePath() {} },
    },
    globals: {
      fetch: async (...args) => {
        calls.push(args);
        return responses.shift();
      },
    },
  });
  return { api, calls };
}

test("media readers validate the same contract and preserve private URL mapping", async () => {
  const { api } = boundary("lib/api.ts", [
    response([media]),
    response([{ ...media, createdAt: null }]),
  ]);
  assert.equal(
    (await api.fetchMedia("token", "tenant"))[0].url,
    "/api/files/image.png",
  );
  await assert.rejects(api.fetchMedia("token", "tenant"), {
    name: "ContractError",
  });
  const actions = boundary("actions/media.ts", [
    response([media]),
    response({ ...media, id: null }),
  ]);
  assert.equal(
    (await actions.api.getMediaList()).data[0].url,
    "/api/files/image.png",
  );
  assert.ok((await actions.api.uploadMedia(new FormData())).error);
});

test("profile and tenant readers reject invalid successful JSON", async () => {
  const { api } = boundary("lib/api.ts", [
    response(profile),
    response([tenant]),
    response({}),
    response([{}]),
  ]);
  assert.equal((await api.fetchProfile("token")).id, "user");
  assert.equal((await api.fetchTenants("token"))[0].role, "ADMIN");
  await assert.rejects(api.fetchProfile("token"), { name: "ContractError" });
  await assert.rejects(api.fetchTenants("token"), { name: "ContractError" });
});

test("workspace requests require a schema while retaining cookies, tenant override, FormData and no-store", async () => {
  const { api, calls } = boundary("lib/workspace-api.ts", [response(media)]);
  const form = new FormData();
  form.set("file", "fixture");
  const item = await api.workspaceRequest(
    "/media/upload",
    contracts.mediaSchema,
    { method: "POST", body: form },
    "other-tenant",
  );
  assert.equal(item.id, "media");
  assert.equal(calls[0][1].headers.get("Authorization"), "Bearer token");
  assert.equal(calls[0][1].headers.get("x-tenant-id"), "other-tenant");
  assert.equal(calls[0][1].headers.get("Content-Type"), null);
  assert.equal(calls[0][1].cache, "no-store");
  assert.equal(calls[0][1].body, form);
});

test("workspace tenant memoized path validates its requested schema and avoids unsafe casts", async () => {
  const { api, calls } = boundary("lib/workspace-api.ts", [
    response([tenant]),
    response([tenant]),
  ]);
  assert.equal(
    (await api.workspaceRequest("/tenants", contracts.tenantsSchema))[0].id,
    "tenant",
  );
  await assert.rejects(
    api.workspaceRequest("/tenants", contracts.mediaSchema),
    { name: "ContractError" },
  );
  assert.equal(calls.length, 2);
});

test("HTTP errors, absent credentials and malformed successful JSON stay failures", async () => {
  const { api } = boundary("lib/workspace-api.ts", [
    response({ message: ["first", "second"] }, 400),
    response({ message: { secret: "do not expose" } }, 500),
    response({}),
  ]);
  await assert.rejects(
    api.workspaceRequest("/media", contracts.mediaSchema),
    /first\. second/,
  );
  await assert.rejects(
    api.workspaceRequest("/media", contracts.mediaSchema),
    /The request could not be completed/,
  );
  await assert.rejects(api.workspaceRequest("/media", contracts.mediaSchema), {
    name: "ContractError",
  });
  const absent = boundary("lib/workspace-api.ts", [], "");
  await assert.rejects(
    absent.api.workspaceRequest("/media", contracts.mediaSchema),
    /session has expired/,
  );
  assert.equal(absent.calls.length, 0);
});

test("export status is closed and terminal handling covers every supported value", () => {
  for (const [status, terminal] of [
    ["Pending", false],
    ["Processing", false],
    ["Completed", true],
    ["Failed", true],
  ]) {
    assert.equal(
      contracts.exportIsTerminal(contracts.exportStatusSchema.parse(status)),
      terminal,
    );
  }
  assert.throws(
    () => contracts.parseContract(contracts.exportStatusSchema, "Unknown"),
    { name: "ContractError" },
  );
  assert.equal(
    contracts.apiMessage({ message: { password: "secret" } }, "fallback"),
    "fallback",
  );
});

test("summary/full parsers reject projection drift, invalid enum, null date and missing pagination", () => {
  const summary = {
    id: "content",
    title: "Title",
    slug: "title",
    status: "DRAFT",
    publishedAt: null,
    authorId: "user",
    tenantId: "tenant",
    categoryId: null,
    category: null,
    author: {
      id: "user",
      email: "test@example.test",
      firstName: null,
      lastName: null,
    },
    createdAt: date,
    updatedAt: date,
  };
  const meta = {
    page: 1,
    take: 10,
    itemCount: 1,
    pageCount: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  };
  assert.ok(
    contracts.contentSummaryPageSchema.safeParse({ data: [summary], meta })
      .success,
  );
  assert.ok(
    contracts.contentFullPageSchema.safeParse({
      data: [{ ...summary, body: "Body" }],
      meta,
    }).success,
  );
  for (const item of [
    { ...summary, body: "unexpected" },
    { ...summary, status: "ARCHIVED" },
    { ...summary, createdAt: null },
  ]) {
    assert.equal(
      contracts.contentSummaryPageSchema.safeParse({ data: [item], meta })
        .success,
      false,
    );
  }
  assert.equal(
    contracts.contentFullPageSchema.safeParse({ data: [summary], meta })
      .success,
    false,
  );
  assert.equal(
    contracts.contentSummaryPageSchema.safeParse({ data: [summary] }).success,
    false,
  );
});
