// Read-only inventory. No deletion flag is intentionally provided.
const path = require("node:path");
if (!process.env.DATABASE_URL)
  throw new Error("Provide an explicit DATABASE_URL; .env is not loaded.");
process.chdir(path.resolve(__dirname, "../apps/api"));
const { PrismaService } = require("../apps/api/dist/database/prisma.service");
const {
  StorageRetentionService,
} = require("../apps/api/dist/modules/storage/storage-retention.service");
const prisma = new PrismaService();
(async () => {
  try {
    const candidates = await new StorageRetentionService(prisma).collect(true);
    console.log(JSON.stringify({ dryRun: true, candidates }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
})().catch(() => {
  console.error("Retention inventory failed; no files were removed.");
  process.exitCode = 1;
});
