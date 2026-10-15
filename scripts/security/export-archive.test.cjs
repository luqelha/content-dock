const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const { inflateRawSync } = require("node:zlib");
const ts = require("typescript");
const source = path.resolve(__dirname, "../../apps/api/src");
function load(relative, mocks = {}) {
  const filename = path.join(source, relative);
  const actual = createRequire(filename);
  const context = {
    exports: {},
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    require: (name) =>
      Object.hasOwn(mocks, name) ? mocks[name] : actual(name),
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        experimentalDecorators: true,
      },
    }).outputText,
    context,
    { filename },
  );
  return context.exports;
}
const { FileVaultService } = load("modules/storage/file-vault.service.ts");
const { CompressionService } = load("modules/export/compression.service.ts", {
  "./export-filename": load("modules/export/export-filename.ts"),
  "../../database/prisma.service": { PrismaService: class {} },
  "../storage/file-vault.service": { FileVaultService },
});
function extractSingleZipEntry(zip) {
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
  return inflateRawSync(zip.subarray(start, start + size)).toString("utf8");
}
test("real archive writer produces a decryptable tenant-scoped ZIP and removes failed partial output", async () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "atlas-export-regression-"),
  );
  const original = process.cwd();
  const key = process.env.STORAGE_ENCRYPTION_KEY;
  try {
    process.chdir(root);
    process.env.STORAGE_ENCRYPTION_KEY = "a".repeat(64);
    const vault = new FileVaultService();
    const rows = [
      {
        id: "one",
        tenantId: "tenant-1",
        action: "TEST",
        details: { safe: true },
      },
    ];
    const prisma = {
      auditLog: {
        findMany: async (query) => {
          assert.equal(query.where.tenantId, "tenant-1");
          assert.equal(query.take, 500);
          return rows;
        },
      },
    };
    const compression = new CompressionService(prisma, vault);
    const job = {
      jobId: "11111111-1111-4111-8111-111111111111",
      tenantId: "tenant-1",
      startDate: "2026-10-01",
      endDate: "2026-10-12",
    };
    const result = await compression.compressLogs(job);
    const file = path.join(root, "storage/exports", result.zipName);
    assert.equal(
      fs.readFileSync(file + ".enc").includes(Buffer.from("tenant-1")),
      false,
    );
    const chunks = [];
    for await (const chunk of vault.archiveReader(file)) chunks.push(chunk);
    assert.deepEqual(
      extractSingleZipEntry(Buffer.concat(chunks))
        .trim()
        .split("\n")
        .map(JSON.parse),
      rows,
    );
    const second = await compression.compressLogs(job);
    assert.notEqual(second.zipName, result.zipName);
    assert.ok(fs.existsSync(file + ".enc"));
    await compression.removeArchive(second.zipName);
    assert.ok(fs.existsSync(file + ".enc"));
    prisma.auditLog.findMany = async () => {
      throw new Error("Test database unavailable");
    };
    await assert.rejects(
      compression.compressLogs(job),
      /unavailable/,
    );
    assert.deepEqual(fs.readdirSync(path.dirname(file)), [
      result.zipName + ".enc",
    ]);
  } finally {
    process.chdir(original);
    if (key === undefined) delete process.env.STORAGE_ENCRYPTION_KEY;
    else process.env.STORAGE_ENCRYPTION_KEY = key;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
