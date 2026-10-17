-- Read-only aggregate inventory. No identifiers, payloads, filenames or deletion.
-- Run against an explicitly selected database using psql -X -v ON_ERROR_STOP=1 -f.
-- 30 days is a PROPOSED metadata window, not authorization to purge.
\set ON_ERROR_STOP on
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '3s';
SELECT json_build_object(
  'inventoryAt', CURRENT_TIMESTAMP,
  'readOnly', current_setting('transaction_read_only'),
  'exportMetadata', (
    SELECT json_build_object(
      'total', count(*),
      'expired', count(*) FILTER (WHERE "expiresAt" <= CURRENT_TIMESTAMP),
      'activeLease', count(*) FILTER (WHERE "leaseUntil" > CURRENT_TIMESTAMP),
      'terminalExpiredOver30Days', count(*) FILTER (
        WHERE status IN ('Completed', 'Failed')
          AND "expiresAt" < CURRENT_TIMESTAMP - INTERVAL '30 days'
          AND ("leaseUntil" IS NULL OR "leaseUntil" <= CURRENT_TIMESTAMP)),
      'nonterminalExpiredOver30Days', count(*) FILTER (
        WHERE status NOT IN ('Completed', 'Failed')
          AND "expiresAt" < CURRENT_TIMESTAMP - INTERVAL '30 days'),
      'oldestCreatedAt', min("createdAt")
    ) FROM "ExportTask"
  ),
  'audit', (SELECT json_build_object('total', count(*), 'oldestCreatedAt', min("createdAt")) FROM "AuditLog"),
  'media', (SELECT json_build_object('referencedRows', count(*)) FROM "Media"),
  'avatar', (SELECT json_build_object('referencedUsers', count(*) FILTER (WHERE "avatarUrl" IS NOT NULL)) FROM "User")
) AS retention_inventory;
ROLLBACK;
