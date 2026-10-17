-- Phase 4B: measured dashboard recent-content bottleneck.
-- PostgreSQL concurrent builds avoid blocking normal application writes.
-- Do not wrap this migration in a transaction. A failed concurrent build can
-- leave an invalid index: inspect pg_index and follow the Phase 4B runbook.
-- Keep exactly one statement per file (Prisma 5/PostgreSQL implicit transaction).
CREATE INDEX CONCURRENTLY "Content_tenantId_updatedAt_idx" ON "Content"("tenantId", "updatedAt");
