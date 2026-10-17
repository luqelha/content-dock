# Changes relative to the Phase 2 snapshot

Unchanged pre-remediation source is excluded. Files absent from the snapshot are marked explicitly; absence alone does not establish authorship. Original audit artifacts and generated Phase2 evidence are excluded. Line numbers are current diff-hunk starts; full locations and SHA256 hashes are in `changed-files.json`.

| File | Change | Current lines |
| --- | --- | --- |
| [.env.production.example](../../.env.production.example) | modified | 10, 19 |
| [Caddyfile](../../Caddyfile) | modified | 5 |
| [apps/api/docs/PERFORMANCE_REPORT.md](../../apps/api/docs/PERFORMANCE_REPORT.md) | modified | 3, 8, 10, 18, 28 |
| [apps/api/docs/RELEASE_NOTES.md](../../apps/api/docs/RELEASE_NOTES.md) | modified | 25 |
| [apps/api/prisma/migrations/20261011000100_durable_export_tasks/migration.sql](../../apps/api/prisma/migrations/20261011000100_durable_export_tasks/migration.sql) | not in snapshot | 1 |
| [apps/api/src/common/dto/list-page.dto.ts](../../apps/api/src/common/dto/list-page.dto.ts) | not in snapshot | 1 |
| [apps/api/src/common/guards/auth-client-identity.ts](../../apps/api/src/common/guards/auth-client-identity.ts) | not in snapshot | 1 |
| [apps/api/src/common/guards/rate-limit.guard.ts](../../apps/api/src/common/guards/rate-limit.guard.ts) | modified | 6, 18, 29 |
| [apps/api/src/modules/storage/storage-retention.service.ts](../../apps/api/src/modules/storage/storage-retention.service.ts) | not in snapshot | 1 |
| [apps/api/src/modules/storage/storage.module.ts](../../apps/api/src/modules/storage/storage.module.ts) | modified | 4, 7 |
| [apps/api/src/modules/storage/validate-upload.ts](../../apps/api/src/modules/storage/validate-upload.ts) | not in snapshot | 1 |
| [apps/api/src/modules/tenant/membership.controller.ts](../../apps/api/src/modules/tenant/membership.controller.ts) | modified | 1, 36 |
| [apps/api/src/modules/tenant/membership.service.ts](../../apps/api/src/modules/tenant/membership.service.ts) | modified | 13, 21, 25, 36, 40, 53, 56, 61, 66, 72 |
| [apps/api/test/e2e/security.e2e-spec.ts](../../apps/api/test/e2e/security.e2e-spec.ts) | not in snapshot | 1 |
| [apps/api/test/integration/durability.int-spec.ts](../../apps/api/test/integration/durability.int-spec.ts) | not in snapshot | 1 |
| [apps/api/test/unit/security/audit-attribution.spec.ts](../../apps/api/test/unit/security/audit-attribution.spec.ts) | not in snapshot | 1 |
| [apps/api/test/unit/security/auth-client-identity.spec.ts](../../apps/api/test/unit/security/auth-client-identity.spec.ts) | not in snapshot | 1 |
| [apps/api/test/unit/security/config-and-errors.spec.ts](../../apps/api/test/unit/security/config-and-errors.spec.ts) | not in snapshot | 1 |
| [apps/api/test/unit/security/storage-retention.spec.ts](../../apps/api/test/unit/security/storage-retention.spec.ts) | not in snapshot | 1 |
| [apps/api/test/unit/security/upload-content.spec.ts](../../apps/api/test/unit/security/upload-content.spec.ts) | not in snapshot | 1 |
| [apps/web-admin/src/actions/category-options.ts](../../apps/web-admin/src/actions/category-options.ts) | not in snapshot | 1 |
| [apps/web-admin/src/actions/workspace.ts](../../apps/web-admin/src/actions/workspace.ts) | modified | 128 |
| [apps/web-admin/src/app/dashboard/exports/page.tsx](../../apps/web-admin/src/app/dashboard/exports/page.tsx) | modified | 4, 18 |
| [apps/web-admin/src/app/dashboard/users/page.tsx](../../apps/web-admin/src/app/dashboard/users/page.tsx) | modified | 1, 11, 25 |
| [apps/web-admin/src/app/error.tsx](../../apps/web-admin/src/app/error.tsx) | not in snapshot | 1 |
| [apps/web-admin/src/components/dashboard/exports-client.tsx](../../apps/web-admin/src/components/dashboard/exports-client.tsx) | modified | 16, 36, 69, 80 |
| [apps/web-admin/src/components/dashboard/list-pagination.tsx](../../apps/web-admin/src/components/dashboard/list-pagination.tsx) | not in snapshot | 1 |
| [apps/web-admin/src/components/ui/accessible-dialog.tsx](../../apps/web-admin/src/components/ui/accessible-dialog.tsx) | not in snapshot | 1 |
| [apps/web-admin/src/lib/auth-client-headers.ts](../../apps/web-admin/src/lib/auth-client-headers.ts) | not in snapshot | 1 |
| [apps/web-admin/src/lib/workspace-api.ts](../../apps/web-admin/src/lib/workspace-api.ts) | modified | 3, 18 |
| [apps/web-admin/src/proxy.ts](../../apps/web-admin/src/proxy.ts) | modified | 65 |
| [playwright.config.ts](../../playwright.config.ts) | not in snapshot | 1 |
| [scripts/benchmark-safety.mjs](../../scripts/benchmark-safety.mjs) | not in snapshot | 1 |
| [scripts/benchmark.mjs](../../scripts/benchmark.mjs) | modified | 3, 14, 43, 55, 73 |
| [scripts/database/README.md](../../scripts/database/README.md) | modified | 59 |
| [scripts/database/create-runtime-role.sql](../../scripts/database/create-runtime-role.sql) | modified | 31 |
| [scripts/database/grant-export-task.sql](../../scripts/database/grant-export-task.sql) | not in snapshot | 1 |
| [scripts/database/verify-runtime-role.sql](../../scripts/database/verify-runtime-role.sql) | modified | 27, 34, 40 |
| [scripts/security/benchmark-safety.test.cjs](../../scripts/security/benchmark-safety.test.cjs) | not in snapshot | 1 |
| [scripts/security/database-regression.cjs](../../scripts/security/database-regression.cjs) | modified | 75, 111 |
| [scripts/security/deployment.test.cjs](../../scripts/security/deployment.test.cjs) | modified | 38, 112, 168 |
| [scripts/security/export-archive.test.cjs](../../scripts/security/export-archive.test.cjs) | not in snapshot | 1 |
| [scripts/security/proxy-smoke.cjs](../../scripts/security/proxy-smoke.cjs) | not in snapshot | 1 |
| [scripts/security/runtime-smoke.cjs](../../scripts/security/runtime-smoke.cjs) | not in snapshot | 1 |
| [scripts/security/web-auth.test.cjs](../../scripts/security/web-auth.test.cjs) | modified | 15, 97 |
| [scripts/security/web-data.test.cjs](../../scripts/security/web-data.test.cjs) | not in snapshot | 1 |
| [scripts/storage-retention.cjs](../../scripts/storage-retention.cjs) | not in snapshot | 1 |
| [tests/browser/fixtures/upload.png](../../tests/browser/fixtures/upload.png) | not in snapshot | 1 |
| [tests/browser/security-flows.spec.ts](../../tests/browser/security-flows.spec.ts) | not in snapshot | 1 |
| [.github/workflows/ci.yml](../../.github/workflows/ci.yml) | modified | 51, 61, 71 |
| [.gitignore](../../.gitignore) | modified | 158 |
| [README.md](../../README.md) | modified | 68, 71 |
| [apps/api/.env.example](../../apps/api/.env.example) | modified | 12, 14, 21 |
| [apps/api/Dockerfile](../../apps/api/Dockerfile) | modified | 7, 10 |
| [apps/api/docs/SECURITY.md](../../apps/api/docs/SECURITY.md) | modified | 21 |
| [apps/api/docs/TEST_STRATEGY.md](../../apps/api/docs/TEST_STRATEGY.md) | modified | 29, 46 |
| [apps/api/nginx/nginx.conf](../../apps/api/nginx/nginx.conf) | modified | 1, 9, 20 |
| [apps/api/package.json](../../apps/api/package.json) | modified | 32, 45, 56, 62, 104 |
| [apps/api/prisma/schema.prisma](../../apps/api/prisma/schema.prisma) | modified | 113 |
| [apps/api/src/app.controller.ts](../../apps/api/src/app.controller.ts) | modified | 17 |
| [apps/api/src/common/filters/http-exception.filter.ts](../../apps/api/src/common/filters/http-exception.filter.ts) | modified | 26, 28, 40 |
| [apps/api/src/common/filters/prisma-client-exception.filter.ts](../../apps/api/src/common/filters/prisma-client-exception.filter.ts) | modified | 15, 20, 28, 35, 45 |
| [apps/api/src/common/guards/rbac.guard.ts](../../apps/api/src/common/guards/rbac.guard.ts) | modified | 87 |
| [apps/api/src/common/interceptors/activity-tracking.interceptor.ts](../../apps/api/src/common/interceptors/activity-tracking.interceptor.ts) | modified | 1, 5, 11, 15, 22, 26, 32, 37, 78, 81 |
| [apps/api/src/common/interceptors/cache.interceptor.ts](../../apps/api/src/common/interceptors/cache.interceptor.ts) | modified | 14 |
| [apps/api/src/config/env.validation.ts](../../apps/api/src/config/env.validation.ts) | modified | 8, 13, 15, 17 |
| [apps/api/src/database/prisma.service.ts](../../apps/api/src/database/prisma.service.ts) | modified | 1, 7 |
| [apps/api/src/modules/audit/audit.service.ts](../../apps/api/src/modules/audit/audit.service.ts) | modified | 14, 27, 51, 59 |
| [apps/api/src/modules/auth/auth.module.ts](../../apps/api/src/modules/auth/auth.module.ts) | modified | 23 |
| [apps/api/src/modules/auth/dto/register.dto.ts](../../apps/api/src/modules/auth/dto/register.dto.ts) | modified | 10, 13 |
| [apps/api/src/modules/auth/services/auth.service.ts](../../apps/api/src/modules/auth/services/auth.service.ts) | modified | 15, 24, 63, 122, 126, 143, 146, 170, 178 |
| [apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts](../../apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts) | modified | 13, 22 |
| [apps/api/src/modules/auth/strategies/jwt.strategy.ts](../../apps/api/src/modules/auth/strategies/jwt.strategy.ts) | modified | 3, 12, 20 |
| [apps/api/src/modules/cms/controllers/category.controller.ts](../../apps/api/src/modules/cms/controllers/category.controller.ts) | modified | 1, 43 |
| [apps/api/src/modules/cms/dto/query-content.dto.ts](../../apps/api/src/modules/cms/dto/query-content.dto.ts) | modified | 2, 7, 13 |
| [apps/api/src/modules/cms/services/category.service.ts](../../apps/api/src/modules/cms/services/category.service.ts) | modified | 6, 13, 39, 52, 60, 73, 88, 103, 120, 135, 142, 152 (full list in JSON) |
| [apps/api/src/modules/cms/services/content.service.ts](../../apps/api/src/modules/cms/services/content.service.ts) | modified | 28, 42, 52, 79, 81, 86, 109, 129, 146, 166, 179 |
| [apps/api/src/modules/export/compression.service.ts](../../apps/api/src/modules/export/compression.service.ts) | modified | 2, 8, 13, 17, 20, 45, 48, 50, 52, 55, 59, 68 (full list in JSON) |
| [apps/api/src/modules/export/export.controller.ts](../../apps/api/src/modules/export/export.controller.ts) | modified | 14, 58, 72, 74, 76 |
| [apps/api/src/modules/export/export.service.ts](../../apps/api/src/modules/export/export.service.ts) | modified | 1, 11, 14, 25, 31, 34, 42, 54, 74, 78, 106, 110 |
| [apps/api/src/modules/export/worker.controller.ts](../../apps/api/src/modules/export/worker.controller.ts) | modified | 3, 6, 14, 19, 22, 26, 81 |
| [apps/api/src/modules/media/media.controller.ts](../../apps/api/src/modules/media/media.controller.ts) | modified | 1, 76 |
| [apps/api/src/modules/media/media.service.ts](../../apps/api/src/modules/media/media.service.ts) | modified | 1, 5, 10, 29, 32, 45, 48, 55, 63, 68, 72 |
| [apps/api/src/modules/tenant/tenant.service.ts](../../apps/api/src/modules/tenant/tenant.service.ts) | modified | 12, 20, 37, 61, 76, 84, 93 |
| [apps/api/src/modules/user/dto/update-user.dto.ts](../../apps/api/src/modules/user/dto/update-user.dto.ts) | modified | 6 |
| [apps/api/src/modules/user/user.controller.ts](../../apps/api/src/modules/user/user.controller.ts) | modified | 14, 27, 35, 42, 46, 115, 125, 132 |
| [apps/api/src/modules/user/user.service.ts](../../apps/api/src/modules/user/user.service.ts) | modified | 18, 29, 41, 49, 80, 88, 100, 111, 119, 125, 139, 147 |
| [apps/api/test/e2e/media.e2e-spec.ts](../../apps/api/test/e2e/media.e2e-spec.ts) | modified | 7, 21, 23 |
| [apps/api/test/e2e/test-utils.ts](../../apps/api/test/e2e/test-utils.ts) | modified | 9, 20, 42, 74 |
| [apps/api/test/integration/category.service.int-spec.ts](../../apps/api/test/integration/category.service.int-spec.ts) | modified | 93, 138 |
| [apps/api/test/integration/int-test-utils.ts](../../apps/api/test/integration/int-test-utils.ts) | modified | 34 |
| [apps/api/test/unit/modules/audit/audit.service.spec.ts](../../apps/api/test/unit/modules/audit/audit.service.spec.ts) | modified | 23, 64, 67 |
| [apps/api/test/unit/modules/auth/services/auth.service.spec.ts](../../apps/api/test/unit/modules/auth/services/auth.service.spec.ts) | modified | 1, 38 |
| [apps/api/test/unit/modules/media/media.service.spec.ts](../../apps/api/test/unit/modules/media/media.service.spec.ts) | modified | 18 |
| [apps/api/test/unit/modules/tenant/tenant.service.spec.ts](../../apps/api/test/unit/modules/tenant/tenant.service.spec.ts) | modified | 25 |
| [apps/api/test/unit/modules/user/user.controller.spec.ts](../../apps/api/test/unit/modules/user/user.controller.spec.ts) | modified | 1, 3, 32, 98, 103, 107, 109 |
| [apps/api/test/unit/modules/user/user.service.spec.ts](../../apps/api/test/unit/modules/user/user.service.spec.ts) | modified | 28 |
| [apps/api/tsconfig.json](../../apps/api/tsconfig.json) | modified | 17 |
| [apps/web-admin/package.json](../../apps/web-admin/package.json) | modified | 18, 29, 44 |
| [apps/web-admin/src/actions/auth.ts](../../apps/web-admin/src/actions/auth.ts) | modified | 5, 29, 46, 111 |
| [apps/web-admin/src/actions/contents.ts](../../apps/web-admin/src/actions/contents.ts) | modified | 5, 12, 46 |
| [apps/web-admin/src/actions/media.ts](../../apps/web-admin/src/actions/media.ts) | modified | 70, 83, 92, 151, 160, 169, 172, 183, 185, 188, 195 |
| [apps/web-admin/src/app/(auth)/login/page.tsx](../../apps/web-admin/src/app/(auth)/login/page.tsx) | modified | 4, 15, 85 |
| [apps/web-admin/src/app/dashboard/categories/page.tsx](../../apps/web-admin/src/app/dashboard/categories/page.tsx) | modified | 1, 9, 22, 27 |
| [apps/web-admin/src/app/dashboard/content/[id]/page.tsx](../../apps/web-admin/src/app/dashboard/content/[id]/page.tsx) | modified | 2, 22, 25, 52 |
| [apps/web-admin/src/app/dashboard/content/create/page.tsx](../../apps/web-admin/src/app/dashboard/content/create/page.tsx) | modified | 13, 18 |
| [apps/web-admin/src/app/dashboard/content/page.tsx](../../apps/web-admin/src/app/dashboard/content/page.tsx) | modified | 19 |
| [apps/web-admin/src/app/dashboard/layout.tsx](../../apps/web-admin/src/app/dashboard/layout.tsx) | modified | 22 |
| [apps/web-admin/src/app/dashboard/media/page.tsx](../../apps/web-admin/src/app/dashboard/media/page.tsx) | modified | 1, 15, 28, 33 |
| [apps/web-admin/src/components/dashboard/categories/category-modal.tsx](../../apps/web-admin/src/components/dashboard/categories/category-modal.tsx) | modified | 2, 115, 121, 149, 177 |
| [apps/web-admin/src/components/dashboard/categories/delete-modal.tsx](../../apps/web-admin/src/components/dashboard/categories/delete-modal.tsx) | modified | 6, 35, 49, 51, 71 |
| [apps/web-admin/src/components/dashboard/content/columns.tsx](../../apps/web-admin/src/components/dashboard/content/columns.tsx) | modified | 3, 37, 84, 121, 125 |
| [apps/web-admin/src/components/dashboard/content/content-form.tsx](../../apps/web-admin/src/components/dashboard/content/content-form.tsx) | modified | 3, 9, 52, 114, 141, 152, 452, 482 |
| [apps/web-admin/src/components/dashboard/media/media-card.tsx](../../apps/web-admin/src/components/dashboard/media/media-card.tsx) | modified | 20, 107, 122, 155, 162, 189, 196, 215, 238, 263 |
| [apps/web-admin/src/components/dashboard/media/media-client.tsx](../../apps/web-admin/src/components/dashboard/media/media-client.tsx) | modified | 29, 32, 51, 56, 59, 165, 172 |
| [apps/web-admin/src/components/dashboard/media/media-delete-modal.tsx](../../apps/web-admin/src/components/dashboard/media/media-delete-modal.tsx) | modified | 2, 43, 57, 79, 81, 100, 102 |
| [apps/web-admin/src/components/dashboard/media/media-dropzone.tsx](../../apps/web-admin/src/components/dashboard/media/media-dropzone.tsx) | modified | 17, 69, 74, 78, 88, 125, 130 |
| [apps/web-admin/src/components/dashboard/media/media-preview-modal.tsx](../../apps/web-admin/src/components/dashboard/media/media-preview-modal.tsx) | modified | 2, 88, 99, 110, 121, 132, 153, 170, 192, 201, 204, 225 (full list in JSON) |
| [apps/web-admin/src/components/dashboard/media/media-upload-modal.tsx](../../apps/web-admin/src/components/dashboard/media/media-upload-modal.tsx) | modified | 2, 96, 108, 122, 129, 134, 143, 159, 163, 200, 213, 222 (full list in JSON) |
| [apps/web-admin/src/components/ui/image-picker-modal.tsx](../../apps/web-admin/src/components/ui/image-picker-modal.tsx) | modified | 2, 50, 52, 56, 60, 65, 101, 167, 204, 214, 292, 327 (full list in JSON) |
| [apps/web-admin/src/components/ui/wysiwyg-editor.tsx](../../apps/web-admin/src/components/ui/wysiwyg-editor.tsx) | modified | 3, 29, 80, 92, 103, 113, 123, 133, 147, 157, 167, 196 (full list in JSON) |
| [apps/web-admin/src/lib/api.ts](../../apps/web-admin/src/lib/api.ts) | modified | 2, 42, 100, 107, 109, 119, 123, 138, 151, 156, 180, 182 (full list in JSON) |
| [docker-compose.prod.yml](../../docker-compose.prod.yml) | modified | 26, 28, 60 |
| [nginx/nginx.conf](../../nginx/nginx.conf) | modified | 3, 17, 22 |
| [package-lock.json](../../package-lock.json) | modified | 12, 30, 43, 54, 60, 461, 494, 509, 889, 1126, 1267, 1499 (full list in JSON) |
| [package.json](../../package.json) | modified | 16, 24 |
