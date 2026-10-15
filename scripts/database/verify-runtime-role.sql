-- Read-only verification. Run through the application's connection, never the owner URL.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $$
DECLARE
  role_record record;
  table_name text;
BEGIN
  SELECT * INTO role_record FROM pg_roles WHERE rolname = current_user;
  IF current_user <> 'atlas_app' OR role_record.rolsuper OR role_record.rolcreatedb
    OR role_record.rolcreaterole OR role_record.rolreplication OR role_record.rolbypassrls
    OR role_record.rolinherit THEN
    RAISE EXCEPTION 'Runtime must use the restricted atlas_app login';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member = role_record.oid) THEN
    RAISE EXCEPTION 'Runtime must not be a member of other roles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_database WHERE datname = current_database() AND datdba = role_record.oid)
    OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspowner = role_record.oid)
    OR EXISTS (SELECT 1 FROM pg_class WHERE relowner = role_record.oid) THEN
    RAISE EXCEPTION 'Runtime must not own databases, schemas, or relations';
  END IF;
  IF has_database_privilege(current_database(), 'CREATE')
    OR has_schema_privilege('public', 'CREATE') THEN
    RAISE EXCEPTION 'Runtime can create persistent database objects';
  END IF;
  FOREACH table_name IN ARRAY ARRAY['Tenant', 'User', 'TenantUser', 'Category', 'Content', 'Media', 'AuditLog', 'ExportTask'] LOOP
    IF NOT has_table_privilege(format('public.%I', table_name), 'SELECT')
      OR NOT has_table_privilege(format('public.%I', table_name), 'INSERT')
      OR has_table_privilege(format('public.%I', table_name), 'TRUNCATE,REFERENCES,TRIGGER')
      OR has_table_privilege(format('public.%I', table_name), 'SELECT WITH GRANT OPTION,INSERT WITH GRANT OPTION,UPDATE WITH GRANT OPTION,DELETE WITH GRANT OPTION') THEN
      RAISE EXCEPTION 'Unexpected privileges for %', table_name;
    END IF;
    IF table_name NOT IN ('AuditLog', 'ExportTask') AND (
      NOT has_table_privilege(format('public.%I', table_name), 'UPDATE')
      OR NOT has_table_privilege(format('public.%I', table_name), 'DELETE')) THEN
      RAISE EXCEPTION 'Missing application DML privileges for %', table_name;
    END IF;
  END LOOP;
  IF NOT has_table_privilege('public."ExportTask"', 'UPDATE')
    OR has_table_privilege('public."ExportTask"', 'DELETE') THEN
    RAISE EXCEPTION 'Unexpected export task privileges';
  END IF;
  IF has_table_privilege('public."AuditLog"', 'UPDATE,DELETE')
    OR has_table_privilege('public._prisma_migrations', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
    RAISE EXCEPTION 'Runtime must not modify audit history or access migration bookkeeping';
  END IF;
END
$$;
COMMIT;
