-- Reviewed Phase 2 deployment step for an existing atlas_app role, after migrations.
-- Execute as owner on the intended database. No production execution by this task.
\set ON_ERROR_STOP on
BEGIN;
GRANT SELECT, INSERT, UPDATE ON TABLE public."ExportTask" TO atlas_app;
COMMIT;
