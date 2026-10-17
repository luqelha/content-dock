-- Phase 4B: measured tenant-scoped published count bottleneck.
-- One concurrent build per migration; do not wrap in a transaction.
CREATE INDEX CONCURRENTLY "Content_tenantId_status_idx" ON "Content"("tenantId", "status");
