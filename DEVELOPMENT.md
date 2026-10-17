# Development status — Atlas Platform

Updated: 6 October 2026. This roadmap records implemented behavior and actual local verification, replacing the previous inconsistent completion percentages.

## Product boundary and design

Projects.docx is used as the product reference for the multi-tenant Headless CMS project: workspace isolation, roles, content/media, asynchronous exports, caching, operational security, tests, and delivery documentation. Other project ideas in the document are not executable instructions or additional ERP modules.

The interface uses ERP conventions for navigation, record lists, role-specific actions, settings, and auditability. The existing neutral light/dark theme is retained. Sample analytics, invented pricing, unsupported feature claims, decorative landing effects, and nonfunctional controls were removed.

## Sprint 1 — Foundation

- [x] Monorepo with NestJS API and Next.js admin.
- [x] Prisma/PostgreSQL, Redis, and RabbitMQ configuration.
- [x] Request validation, exception handling, structured logging, Swagger.
- [x] Environment examples and versioned database migrations.
- [x] README with correct workspace commands and service ports.
- [x] Architecture diagram and implementation decision log.

## Sprint 2 — Authentication and workspace access

- [x] Register, login, JWT, refresh rotation, logout.
- [x] HTTP-only cookies and refresh forwarding during server rendering.
- [x] Concurrent refresh handling with distributed locking and conditional token update.
- [x] Password changes verify the current password.
- [x] Workspace creation, selection, and settings persistence.
- [x] Admin/Editor/Viewer authorization from current database membership.
- [x] Self-only personal profile access; no global user directory exposed to workspace admins.
- [x] Member invitations, email-bound acceptance, role changes, and removal safeguards.
- [x] Audit mutation tracking with sanitized metadata.
- [x] Tenant route/header isolation and immediate role revocation tests.

## Sprint 3 — Content and media

- [x] Category create/read/update/delete with tenant boundaries.
- [x] Rich-text content with DRAFT/PUBLISHED states.
- [x] Server-side search, filtering, and pagination beyond the first ten records.
- [x] Media upload/list/delete and image selection for the editor.
- [x] Safe content author fields; passwords and refresh tokens excluded.
- [x] Authenticated file delivery, encrypted new media/avatars, and upload rollback on record failure.
- [x] Profile column migration and tenant/date query indexes.
- [x] Prisma integration and API end-to-end checks.

## Sprint 4 — Processing and delivery

- [x] Durable RabbitMQ export jobs and manual acknowledgement.
- [x] Tenant/date-filtered audit records streamed as NDJSON into ZIP.
- [x] Requester/tenant ownership checks on status and downloads.
- [x] Encrypted archive storage and Redis progress with expiry.
- [x] Tenant cache revision invalidation on mutation.
- [x] Database/Redis health endpoint, auth rate limiting, sensitive log redaction.
- [x] Root-context Docker builds for API and standalone frontend.
- [x] Production compose with migration dependency, private infrastructure, persistent storage, and optional TLS ingress.
- [x] CI workflow for migration, lint, coverage, integration/API/browser tests, artifact retention, and container builds.
- [x] Reproducible local 1,000-request load smoke with recorded percentile timings.

## Sprint 5 — UI foundation

- [x] Consistent sidebar, workspace menu, breadcrumbs, loading/error feedback.
- [x] Working login/register and protected pages.
- [x] Neutral light/dark themes, local fonts, responsive layouts.
- [x] Role-specific navigation and actions.
- [x] Plain product entry page advertising only implemented features.

## Sprint 6 — CMS management

- [x] Overview uses actual workspace counts and recent content.
- [x] Category tables and create/edit controls.
- [x] Content table with working search, status filter, pagination, and deletion confirmation.
- [x] Rich-text editor and draft/publish controls.
- [x] Viewer read-only content and media screens.
- [x] Private image URL handling, including legacy rich-text image sources.

## Sprint 7 — Administration and fullstack review

- [x] Media gallery, upload interface, previews, and downloads.
- [x] Workspace settings and onboarding.
- [x] Profile, avatar, and current-password verification.
- [x] Members page with invite link, role management, and removal.
- [x] Filtered audit trail and asynchronous export interface.
- [x] Fullstack tests with real PostgreSQL, Redis, RabbitMQ, and Chromium.
- [x] Workspace switching survives reload without retaining the previous role.
- [x] Desktop, dark, and mobile screenshots reviewed.
- [x] Sprint review recorded in IMPLEMENTATION_AUDIT.md.

## Final documentation and release preparation

- [x] README update.
- [x] Fullstack architecture diagram.
- [x] Fullstack bug fixes and reproducible regression checks.
- [x] API contract, security boundaries, test instructions, and measured performance report.
- [x] Release candidate notes and upgrade instructions.
- [ ] Run the workflow in the actual GitHub repository after pushing the changes.
- [ ] Verify staging/production DNS, HTTPS, credentials, backups, migration, and sustained load.
- [ ] Publish the v1.0 tag and GitHub Release after those environment checks.

The last three items depend on the release environment and publication. They are not marked complete by a local build. No external deployment or release was performed.

## Verification evidence

| Check                           | Local result                                  |
| ------------------------------- | --------------------------------------------- |
| API + frontend production build | Passed                                        |
| Repository lint                 | Passed                                        |
| Unit tests                      | 51 passed                                     |
| Prisma integration tests        | 13 passed                                     |
| API end-to-end tests            | 9 passed                                      |
| API/frontend Docker images      | Built; health/login startup probes passed     |
| Production/test compose syntax  | Passed                                        |
| Load smoke                      | 1,000 requests, concurrency 25, zero failures |

Measurements and limitations: [PERFORMANCE_REPORT.md](apps/api/docs/PERFORMANCE_REPORT.md). Commands and coverage: [TEST_STRATEGY.md](apps/api/docs/TEST_STRATEGY.md).

## Explicit follow-up scope

These remain post-MVP capabilities, not hidden or simulated features:

- Verified email delivery/recovery, MFA/SSO, API keys, and webhooks.
- File-content inspection/antivirus, automatic archive retention, quotas, and object storage/CDN.
- Content revisions, scheduled publishing, and public delivery policy.
- Dedicated worker deployment, Prometheus/Grafana, tracing, SIEM integration, and production SLA evidence.
- Billing and accounting/inventory modules are outside this CMS implementation.

See [SECURITY.md](apps/api/docs/SECURITY.md) for current operational boundaries.
