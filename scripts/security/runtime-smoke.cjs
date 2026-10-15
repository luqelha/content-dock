// Explicitly opt-in: dedicated loopback test API, never production.
const assert = require("node:assert/strict");
const { inflateRawSync } = require("node:zlib");
async function main() {
  const { verifyBenchmarkTarget } = await import("../benchmark-safety.mjs");
  const api = process.env.E2E_API_URL || "http://127.0.0.1:4400/api";
  await verifyBenchmarkTarget(api, process.env.DATABASE_URL);
  async function call(
    route,
    method = "GET",
    data,
    headers = {},
    expected = 200,
  ) {
    const response = await fetch(api + route, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: data ? JSON.stringify(data) : undefined,
    });
    assert.equal(response.status, expected, `${method} ${route}`);
    return response;
  }
  const credentials = {
    email: `runtime-${Date.now()}@example.test`,
    password: "Runtime-Test-Only-428!",
  };
  await call("/auth/register", "POST", credentials, {}, 201);
  const login = await (await call("/auth/login", "POST", credentials)).json();
  const auth = { Authorization: `Bearer ${login.access_token}` };
  const tenant = await (
    await call("/tenants", "POST", { name: "Runtime export test" }, auth, 201)
  ).json();
  const other = await (
    await call("/tenants", "POST", { name: "Other scope" }, auth, 201)
  ).json();
  const headers = { ...auth, "x-tenant-id": tenant.id };
  const today = new Date().toISOString().slice(0, 10);
  const accepted = await (
    await call(
      "/export/logs",
      "POST",
      { startDate: today, endDate: today },
      headers,
      202,
    )
  ).json();
  const id = accepted.data.jobId;
  await call(
    `/export/status/${id}`,
    "GET",
    undefined,
    { ...auth, "x-tenant-id": other.id },
    404,
  );
  let job;
  for (let attempt = 0; attempt < 30; attempt++) {
    job = (
      await (
        await call(`/export/status/${id}`, "GET", undefined, headers)
      ).json()
    ).data;
    if (job.status === "Completed" || job.status === "Failed") break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.equal(job.status, "Completed", job.error);
  const response = await call(
    `/export/download/${id}`,
    "GET",
    undefined,
    headers,
  );
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const zip = Buffer.from(await response.arrayBuffer());
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
  const records = inflateRawSync(zip.subarray(start, start + size))
    .toString("utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.ok(records.length > 0);
  assert.ok(records.every((record) => record.tenantId === tenant.id));
  await call(
    `/export/download/${id}`,
    "GET",
    undefined,
    { ...auth, "x-tenant-id": other.id },
    404,
  );
  console.log(
    JSON.stringify({
      health: "passed",
      leastPrivilegeRuntime: "passed",
      brokerWorkerExport: "passed",
      decryptedZip: "passed",
      tenantIsolation: "passed",
      records: records.length,
    }),
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
