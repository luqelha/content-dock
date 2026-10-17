-- Additive only. Apply with the migration role, never the runtime role.
CREATE TABLE "ExportTask" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "dispatchedAt" TIMESTAMP(3),
  "leaseUntil" TIMESTAMP(3)
);
CREATE INDEX "ExportTask_status_dispatchedAt_idx" ON "ExportTask"("status", "dispatchedAt");
CREATE INDEX "ExportTask_tenantId_createdAt_idx" ON "ExportTask"("tenantId", "createdAt");
CREATE INDEX "ExportTask_expiresAt_idx" ON "ExportTask"("expiresAt");
