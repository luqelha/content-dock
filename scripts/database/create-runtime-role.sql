-- Operator-run provisioning, NOT an application migration or startup hook.
-- Run as the existing database owner after migrations, on an explicitly selected DB:
-- CONTENTDOCK_APP_PASSWORD=<separate secret> psql <owner connection> -X -v ON_ERROR_STOP=1 -f create-runtime-role.sql
-- Existing roles are refused to avoid silently changing another deployment's privileges.
\set ON_ERROR_STOP on
\getenv app_password CONTENTDOCK_APP_PASSWORD
BEGIN;
SELECT set_config('contentdock.runtime_password', :'app_password', true) IS NOT NULL AS password_supplied;
DO $$
BEGIN
  IF length(current_setting('contentdock.runtime_password')) < 32 THEN
    RAISE EXCEPTION 'CONTENTDOCK_APP_PASSWORD must contain at least 32 characters';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'contentdock_app') THEN
    RAISE EXCEPTION 'contentdock_app already exists; review its grants instead of replacing it';
  END IF;
  EXECUTE format(
    'CREATE ROLE contentdock_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD %L',
    current_setting('contentdock.runtime_password')
  );
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO contentdock_app', current_database());
END
$$;
GRANT USAGE ON SCHEMA public TO contentdock_app;
-- UUID IDs require no sequence privileges. No DDL, TRUNCATE, REFERENCES, TRIGGER,
-- grant options, role memberships, or access to _prisma_migrations is granted.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public."Tenant", public."User", public."TenantUser", public."Category",
  public."Content", public."Media" TO contentdock_app;
GRANT SELECT, INSERT ON TABLE public."AuditLog" TO contentdock_app;
GRANT SELECT, INSERT, UPDATE ON TABLE public."ExportTask" TO contentdock_app;
-- New tables require an explicit reviewed grant; do not grant all future tables.
-- Fail closed if legacy PUBLIC grants would confer schema/database creation rights.
DO $$
BEGIN
  IF has_schema_privilege('contentdock_app', 'public', 'CREATE')
    OR has_database_privilege('contentdock_app', current_database(), 'CREATE')
    OR has_table_privilege('contentdock_app', 'public._prisma_migrations', 'SELECT,INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'Unsafe inherited PUBLIC privileges; owner must review before provisioning';
  END IF;
END
$$;
COMMIT;
