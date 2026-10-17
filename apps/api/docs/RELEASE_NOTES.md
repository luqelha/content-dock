# Atlas 1.0 release candidate

## Changes

- Workspace onboarding and switching, persistent settings, and real overview statistics.
- Member invitations, role updates, and workspace removal with administrator safeguards.
- Server-side content search/filter/pagination and readable role-specific actions.
- Audit trail with filters and asynchronous ZIP export with progress and authenticated downloads.
- Tenant isolation checks on tenant paths, analytics, members, private files, and export ownership.
- Encrypted media, avatars, and export files; sanitized audit metadata and safe content authors.
- Token renewal, concurrent refresh handling, and current-password verification for password changes.
- Fullstack browser tests, profile migration, private production services, frontend Docker image, and CI validation.

## Upgrade notes

1. Back up PostgreSQL, Redis, file storage, and the storage encryption key.
2. Apply migrations with prisma migrate deploy. The profile migration tolerates columns previously added using db push.
3. Configure STORAGE_ENCRYPTION_KEY before starting production. Keep this key stable.
4. Users must sign in again because refresh-token hashing has changed.
5. Re-upload legacy avatars; old public /uploads URLs are intentionally no longer exposed.
6. Confirm the configured hostname, TLS profile, and CORS origins in staging.
7. Run the documented validation commands before publishing a tagged release.

This file prepares a release candidate. No GitHub release, tag, DNS change, or production deployment is performed by editing it.

## Security remediation upgrade requirements (12 October 2026)

- Apply `20261011000100_durable_export_tasks` with the migration owner; provision/review the restricted runtime role and its explicit ExportTask grant before starting the API. See `scripts/database/README.md`.
- JWT issuer, audience and token purpose are now enforced. Existing sessions require sign-in again. JWT access/refresh secrets and the separate web/API HMAC secret must be distinct and at least 32 characters.
- Registration requires an eight-character password. Nullable category assignment remains supported; null email/password updates are rejected.
- Media/category/member lists now default to 50 records, maximum 100. External consumers must page using `page` and `take`; array response shapes remain unchanged. Content summary is opt-in.
- Image content is decoded/re-encoded, with bytes/pixel/frame/time limits. Invalid or spoofed uploads may now be rejected.
- Exports persist in PostgreSQL and are limited to ten per workspace per 24 hours, 100,000 rows, 200 MiB plaintext and five minutes. Downloads expire after 24 hours. Complete/download legacy Redis jobs before rollout, or regenerate them; they are not automatically migrated.
- Storage retention stays disabled by default. Review `scripts/storage-retention.cjs` dry-run inventory and backups before enabling `STORAGE_RETENTION_ENABLED=true`. No existing production files have been cleaned by this remediation.
- Review [Security](SECURITY.md) and the [test strategy](TEST_STRATEGY.md) for security boundaries and validation requirements. The earlier local security remediation reports have been removed from the repository. Core browser flows passed through the installed Playwright MCP on 13 October; test-runner execution in remote CI and production deployment gates remain outstanding.
