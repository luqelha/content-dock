# Runtime database role (H-04)

The API uses `DATABASE_APP_URL`. The migration service continues to use the existing
`POSTGRES_USER` owner credentials. There is no fallback from the application URL to
the owner URL. Do not share the passwords or give the owner URL to the API.

`create-runtime-role.sql` is an operator-run provisioning script, not a Prisma
migration or an automatic startup hook. It creates a **new** `atlas_app` login in a
transaction. It does not replace an existing role, transfer ownership, remove data,
alter existing migrations, or enable RLS. Production execution requires separate
operator review and approval; this remediation only executed it on an isolated test
PostgreSQL instance.

## Provisioning sequence

1. Inspect the target host, database, existing owner, PUBLIC grants, and current
   runtime identity. Take the usual deployment backup. Confirm that `atlas_app`
   does not already exist in this PostgreSQL cluster; if it does, review it manually.
   The script intentionally refuses to overwrite it.
2. Plan a separate, randomly generated runtime password of at least 32 characters.
   Supply it as the process environment variable `ATLAS_APP_PASSWORD` using your
   secret manager. Do not commit it. URL-encode it when constructing
   `DATABASE_APP_URL` for the same database and schema as the migration service.
   The Compose hostname is `postgres`; a host-side verification URL must use the
   actual reachable database hostname instead.
3. Apply existing migrations with the existing owner/migrator, while the API is
   stopped during the deployment window. On a new deployment, provision the role
   after `migrate` succeeds and before starting `api`.
4. Run the provisioning SQL against the explicitly selected database as its owner:

   ```text
   psql <owner connection> -X -v ON_ERROR_STOP=1 -f scripts/database/create-runtime-role.sql
   ```

   When using Compose, pass the environment variable by name (not its value) and
   pipe the script into `exec -T`. Resolve the owner/database arguments explicitly:

   ```powershell
   Get-Content -Raw scripts/database/create-runtime-role.sql |
     docker compose --env-file .env.production -f docker-compose.prod.yml exec -T -e ATLAS_APP_PASSWORD postgres psql -X -U <owner> -d <database> -v ON_ERROR_STOP=1
   ```

5. Verify using the **runtime** connection, not the owner connection:

   ```text
   psql <runtime connection> -X -v ON_ERROR_STOP=1 -f scripts/database/verify-runtime-role.sql
   ```

6. Set `DATABASE_APP_URL` in the deployment secret configuration, deploy the API
   image, and verify readiness, auth, CMS, media, membership, and export/audit reads.
   Do not run integration/E2E test suites against production: their helpers truncate
   test tables. Do not run `docker compose down -v` to apply this change.

## Privileges and maintenance

- Runtime: LOGIN, no superuser, CREATEDB, CREATEROLE, inheritance, replication, or
  BYPASSRLS. It receives no role membership or database/schema/table ownership.
- Existing six business tables: SELECT/INSERT/UPDATE/DELETE. AuditLog:
  SELECT/INSERT only. ExportTask: SELECT/INSERT/UPDATE, no DELETE. Existing
  restricted installations must apply `grant-export-task.sql` after the additive
  export migration; do not rerun the new-role provisioning script.
  No access to `_prisma_migrations`, grant options, TRUNCATE,
  REFERENCES, or TRIGGER. UUID IDs do not need sequence grants.
- PostgreSQL's pre-existing PUBLIC privileges, including default database CONNECT
  and TEMPORARY, are not globally revoked by this script. It rejects PUBLIC grants
  that would allow persistent database/schema creation or migration-table access.
  Review broader PUBLIC ACLs separately before revoking privileges shared by other
  clients. The verification script checks effective privileges, not just role flags.
- New tables/sequences do not receive automatic runtime grants. Review and grant
  the operations needed by each future migration. This prevents accidentally
  exposing administrative tables through broad default grants.
- Keep the existing migration owner for compatibility with existing object
  ownership. A separate non-superuser migration-owner migration is a later reviewed
  operational change; no ownership is transferred automatically here.
- For multiple installations on one PostgreSQL cluster, coordinate the fixed
  `atlas_app` role name and database grants. Do not run the provisioning script
  blindly on a cluster where that role already exists.
- Rollback application code using a compatible image while retaining the restricted
  runtime credential. Do not restore owner credentials to the API as a convenience.

## Isolated verification

`npm run test:security:db` requires `DATABASE_APP_URL` with `atlas_app`, a loopback
host, and a dedicated database name containing `_test` or `_review`. It checks
permissions and exercises Prisma CRUD in a transaction that is always rolled back.
It does not load `.env` files. `verify-runtime-role.sql` runs a read-only transaction.

References: [PostgreSQL 15 role attributes](https://www.postgresql.org/docs/15/role-attributes.html),
[GRANT](https://www.postgresql.org/docs/15/sql-grant.html),
[default privileges](https://www.postgresql.org/docs/15/sql-alterdefaultprivileges.html).
