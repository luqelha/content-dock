-- Synthetic rows; only used after the isolated runner verifies an empty tmpfs DB.
INSERT INTO "ExportTask" (id, "tenantId", "userId", status, payload, "createdAt", "expiresAt", "leaseUntil")
VALUES
  ('inventory-completed', 'fixture', 'fixture', 'Completed', '{}', now() - interval '40 days', now() - interval '39 days', NULL),
  ('inventory-failed', 'fixture', 'fixture', 'Failed', '{}', now() - interval '40 days', now() - interval '39 days', NULL),
  ('inventory-leased', 'fixture', 'fixture', 'Completed', '{}', now() - interval '40 days', now() - interval '39 days', now() + interval '1 hour'),
  ('inventory-stalled', 'fixture', 'fixture', 'Pending', '{}', now() - interval '40 days', now() - interval '39 days', NULL),
  ('inventory-recent', 'fixture', 'fixture', 'Completed', '{}', now() - interval '2 days', now() - interval '1 day', NULL),
  ('inventory-live', 'fixture', 'fixture', 'Completed', '{}', now(), now() + interval '1 day', NULL);
