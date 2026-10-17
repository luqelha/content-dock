// Executed by phase3b-drill.cjs inside its isolated production-mode API container.
// Fixture tokens stay in the private drill directory, never in the evidence report.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHash, randomUUID } = require("node:crypto");
const { inflateRawSync } = require("node:zlib");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function zipRecords(zip) {
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50);
  assert.equal(zip.readUInt16LE(end + 10), 1);
  const central = zip.readUInt32LE(end + 16);
  assert.equal(zip.readUInt32LE(central), 0x02014b50);
  assert.equal(zip.readUInt16LE(central + 10), 8);
  const size = zip.readUInt32LE(central + 20);
  const local = zip.readUInt32LE(central + 42);
  const start =
    local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
  return inflateRawSync(zip.subarray(start, start + size))
    .toString("utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
}
async function main() {
  assert.equal(process.env.NODE_ENV, "production");
  assert.equal(new URL(process.env.DATABASE_URL).username, "atlas_app");
  assert.equal(process.env.STORAGE_RETENTION_ENABLED, "false");
  const mode = process.argv[2];
  const fixturePath = "/tmp/phase3b-fixture.json";
  async function call(
    route,
    { method = "GET", body, headers = {}, status = 200 } = {},
  ) {
    const response = await fetch(`http://nginx${route}`, {
      method,
      headers: {
        ...(body && !(body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...headers,
      },
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
      signal: AbortSignal.timeout(15000),
      redirect: "manual",
    });
    assert.equal(
      response.status,
      status,
      `${method} ${route}: unexpected status`,
    );
    return response;
  }
  const health = await (await call("/api/health")).json();
  assert.deepEqual(health, { status: "ok", database: "up", redis: "up" });
  assert.match(await (await call("/login")).text(), /<html/i);
  const protectedPage = await call("/dashboard", { status: 307 });
  assert.match(protectedPage.headers.get("location"), /login/);
  let fixture;
  if (mode === "seed") {
    const accounts = [];
    for (const suffix of ["a", "b"]) {
      const credentials = {
        email: `phase3b-${randomUUID()}-${suffix}@example.test`,
        password: `Fixture-${randomUUID()}!`,
      };
      await call("/api/auth/register", {
        method: "POST",
        body: credentials,
        status: 201,
      });
      accounts.push(
        await (
          await call("/api/auth/login", { method: "POST", body: credentials })
        ).json(),
      );
    }
    const [a, b] = accounts;
    const auth = (account) => ({
      Authorization: `Bearer ${account.access_token}`,
    });
    const tenant = await (
      await call("/api/tenants", {
        method: "POST",
        body: { name: "Phase 3B synthetic A" },
        headers: auth(a),
        status: 201,
      })
    ).json();
    const other = await (
      await call("/api/tenants", {
        method: "POST",
        body: { name: "Phase 3B synthetic B" },
        headers: auth(b),
        status: 201,
      })
    ).json();
    fixture = { a, b, tenant: tenant.id, other: other.id };
    const headers = { ...auth(a), "x-tenant-id": tenant.id };
    const category = await (
      await call("/api/categories", {
        method: "POST",
        body: { name: "Recovery fixture", slug: "recovery-fixture" },
        headers,
        status: 201,
      })
    ).json();
    const content = await (
      await call("/api/contents", {
        method: "POST",
        body: {
          title: "Recovery fixture",
          slug: "recovery-fixture",
          body: "Synthetic recovery content",
          categoryId: category.id,
        },
        headers,
        status: 201,
      })
    ).json();
    fixture.content = content.id;
    const form = new FormData();
    form.append(
      "file",
      new Blob([fs.readFileSync("/tmp/phase3b-upload.png")], {
        type: "image/png",
      }),
      "fixture.png",
    );
    const media = await (
      await call("/api/media/upload", {
        method: "POST",
        body: form,
        headers,
        status: 201,
      })
    ).json();
    fixture.file = media.url.split("/").pop();
    fixture.mediaHash = hash(
      Buffer.from(
        await (
          await call(`/api/media-files/${fixture.file}`, { headers })
        ).arrayBuffer(),
      ),
    );
    const today = new Date().toISOString().slice(0, 10);
    const job = await (
      await call("/api/export/logs", {
        method: "POST",
        body: { startDate: today, endDate: today },
        headers,
        status: 202,
      })
    ).json();
    fixture.job = job.data.jobId;
    let completed = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      const status = (
        await (
          await call(`/api/export/status/${fixture.job}`, { headers })
        ).json()
      ).data.status;
      assert.notEqual(status, "Failed", "Export worker failed");
      if (status === "Completed") {
        completed = true;
        break;
      }
      await pause(1000);
    }
    assert.ok(completed, "Export completion deadline");
    fixture.zipHash = hash(
      Buffer.from(
        await (
          await call(`/api/export/download/${fixture.job}`, { headers })
        ).arrayBuffer(),
      ),
    );
    fs.writeFileSync(fixturePath, JSON.stringify(fixture), { mode: 0o600 });
  } else {
    assert.equal(mode, "verify");
    fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  }
  const own = {
    Authorization: `Bearer ${fixture.a.access_token}`,
    "x-tenant-id": fixture.tenant,
  };
  const foreign = {
    Authorization: `Bearer ${fixture.b.access_token}`,
    "x-tenant-id": fixture.other,
  };
  const forged = { ...foreign, "x-tenant-id": fixture.tenant };
  await call("/api/auth/me", { headers: own });
  await call("/api/contents", { headers: forged, status: 403 });
  await call(`/api/contents/${fixture.content}`, {
    headers: foreign,
    status: 404,
  });
  const content = await (
    await call(`/api/contents/${fixture.content}`, { headers: own })
  ).json();
  assert.equal(content.id, fixture.content);
  await call(`/api/media-files/${fixture.file}`, { status: 401 });
  await call(`/api/media-files/${fixture.file}`, {
    headers: foreign,
    status: 404,
  });
  const media = await call(`/api/media-files/${fixture.file}`, {
    headers: own,
  });
  assert.equal(media.headers.get("cache-control"), "private, no-store");
  assert.equal(hash(Buffer.from(await media.arrayBuffer())), fixture.mediaHash);
  for (const route of ["status", "download"]) {
    await call(`/api/export/${route}/${fixture.job}`, {
      headers: foreign,
      status: 404,
    });
    await call(`/api/export/${route}/${fixture.job}`, { status: 401 });
  }
  const download = await call(`/api/export/download/${fixture.job}`, {
    headers: own,
  });
  assert.equal(download.headers.get("cache-control"), "private, no-store");
  const zip = Buffer.from(await download.arrayBuffer());
  assert.equal(hash(zip), fixture.zipHash);
  const rows = zipRecords(zip);
  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => row.tenantId === fixture.tenant));
  const invalid = await call("/api/export/status/not-a-uuid", {
    headers: own,
    status: 400,
  });
  assert.doesNotMatch(await invalid.text(), /stack|PrismaClient|node_modules/);
  // BFF checks use the same production server, with cookies supplied by this HTTP probe.
  // Browser Secure-cookie/TLS behavior is a separate external gate.
  const cookie = {
    Cookie: `access_token=${fixture.a.access_token}; atlas_active_tenant_id=${fixture.tenant}`,
  };
  const bff = await call(`/api/files/${fixture.file}`, { headers: cookie });
  assert.equal(hash(Buffer.from(await bff.arrayBuffer())), fixture.mediaHash);
  if (mode === "verify") {
    const today = new Date().toISOString().slice(0, 10);
    const accepted = await (
      await call("/api/export/logs", {
        method: "POST",
        body: { startDate: today, endDate: today },
        headers: own,
        status: 202,
      })
    ).json();
    const job = accepted.data.jobId;
    let completed = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      const status = (
        await (await call(`/api/export/status/${job}`, { headers: own })).json()
      ).data.status;
      assert.notEqual(
        status,
        "Failed",
        "Fresh export failed after deployment/recovery",
      );
      if (status === "Completed") {
        completed = true;
        break;
      }
      await pause(1000);
    }
    assert.ok(completed, "Fresh export completion deadline");
    const fresh = zipRecords(
      Buffer.from(
        await (
          await call(`/api/export/download/${job}`, { headers: own })
        ).arrayBuffer(),
      ),
    );
    assert.ok(fresh.length > 0);
    assert.ok(fresh.every((row) => row.tenantId === fixture.tenant));
    await call(`/api/export/download/${job}`, {
      headers: foreign,
      status: 404,
    });
  }
  console.log(
    JSON.stringify({
      mode,
      production: true,
      restrictedRole: true,
      health: "passed",
      frontend: "passed",
      authentication: "passed",
      tenantIsolation: "passed",
      uploadDownload: "passed",
      exportDownload: "passed",
      freshWorkerExport: "passed",
      exportRecords: rows.length,
      bff: "passed",
      validationErrors: "passed",
    }),
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
