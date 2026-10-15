const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const apiRequire = createRequire(
  path.resolve(__dirname, "../../apps/api/package.json"),
);
const { PrismaClient } = apiRequire("@prisma/client");

// Only caller-supplied dedicated test credentials; never load .env files here.
assert.ok(
  process.env.DATABASE_APP_URL,
  "Provide DATABASE_APP_URL for a dedicated test database",
);
const url = new URL(process.env.DATABASE_APP_URL);
assert.match(url.pathname, /(?:^|_)(?:test|review)(?:_|$)/i);
assert.equal(url.username, "atlas_app");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname));
const prisma = new PrismaClient({ datasources: { db: { url: url.href } } });
after(async () => prisma.$disconnect());

test("runtime role is non-owner, non-superuser and cannot assume another role", async () => {
  const [role] = await prisma.$queryRaw`
    SELECT r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolreplication, r.rolbypassrls,
      EXISTS (SELECT 1 FROM pg_auth_members WHERE member = r.oid) AS membership,
      EXISTS (SELECT 1 FROM pg_database WHERE datname = current_database() AND datdba = r.oid) AS owns_database,
      EXISTS (SELECT 1 FROM pg_class WHERE relowner = r.oid) AS owns_relation
    FROM pg_roles r WHERE rolname = current_user`;
  for (const [name, value] of Object.entries(role))
    assert.equal(value, false, name);
});

test("runtime can perform CMS, membership, media, profile and audit operations", async () => {
  const rollback = new Error("ROLLBACK_SECURITY_FIXTURES");
  await assert.rejects(
    prisma.$transaction(async (db) => {
      const tenant = await db.tenant.create({ data: { name: "Phase 1 test" } });
      const user = await db.user.create({
        data: {
          email: `${randomUUID()}@test.invalid`,
          passwordHash: "test-only",
        },
      });
      await db.tenantUser.create({
        data: { tenantId: tenant.id, userId: user.id, role: "ADMIN" },
      });
      const category = await db.category.create({
        data: { tenantId: tenant.id, name: "Test", slug: "test" },
      });
      const content = await db.content.create({
        data: {
          tenantId: tenant.id,
          authorId: user.id,
          categoryId: category.id,
          title: "Test",
          slug: "test",
          body: "test",
        },
      });
      await db.content.update({
        where: { id: content.id },
        data: { status: "PUBLISHED" },
      });
      await db.user.update({
        where: { id: user.id },
        data: { firstName: "Test", refreshToken: "test-hash" },
      });
      const media = await db.media.create({
        data: { tenantId: tenant.id, url: "/test-only", type: "image/png" },
      });
      await db.auditLog.create({
        data: { tenantId: tenant.id, userId: user.id, action: "TEST" },
      });
      const job = await db.exportTask.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          userId: user.id,
          payload: {},
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      await db.exportTask.update({
        where: { id: job.id },
        data: { status: "Completed" },
      });
      assert.equal(
        (await db.content.findMany({ where: { tenantId: tenant.id } })).length,
        1,
      );
      assert.equal(
        (await db.auditLog.findMany({ where: { tenantId: tenant.id } })).length,
        1,
      );
      await db.media.delete({ where: { id: media.id } });
      await db.tenant.delete({ where: { id: tenant.id } });
      await db.user.delete({ where: { id: user.id } });
      throw rollback;
    }),
    (error) => error === rollback,
  );
});

test("runtime cannot create persistent tables, truncate application tables, or read migration records", async () => {
  const [privileges] = await prisma.$queryRaw`
    SELECT has_schema_privilege('public', 'CREATE') AS create_schema,
      has_database_privilege(current_database(), 'CREATE') AS create_database,
      has_table_privilege('public."Tenant"', 'TRUNCATE') AS truncate,
      has_table_privilege('public._prisma_migrations', 'SELECT,INSERT,UPDATE,DELETE') AS migrations,
      has_table_privilege('public."AuditLog"', 'UPDATE,DELETE') AS alter_audit,
      has_table_privilege('public."ExportTask"', 'DELETE') AS delete_export`;
  for (const [name, value] of Object.entries(privileges))
    assert.equal(value, false, name);
  await assert.rejects(
    prisma.$queryRaw`SELECT * FROM public._prisma_migrations`,
    (error) => error.meta?.code === "42501",
  );
});
