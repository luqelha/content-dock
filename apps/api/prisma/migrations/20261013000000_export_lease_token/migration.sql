-- Additive fencing token. Drain old workers before starting token-aware workers.
ALTER TABLE "ExportTask" ADD COLUMN "leaseToken" TEXT;
