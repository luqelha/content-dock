# API contract

Base URL: http://localhost:4000/api. Interactive Swagger: /api/docs; OpenAPI JSON: /api/docs-json. Protected endpoints accept Authorization: Bearer <access token>. Workspace endpoints also require X-Tenant-ID. The Next.js interface keeps these credentials in HTTP-only cookies and forwards requests on the server.

| Method / path                             | Access                 | Behavior                                                          |
| ----------------------------------------- | ---------------------- | ----------------------------------------------------------------- |
| POST /auth/register                       | Public, rate limited   | Generic HTTP 201 for both new and existing email; no user or tokens |
| POST /auth/login                          | Public, rate limited   | Access/refresh JWT and safe user profile                          |
| POST /auth/refresh                        | Refresh JWT bearer     | Rotate session; concurrent requests supported                     |
| POST /auth/logout                         | Authenticated          | Invalidate refresh token                                          |
| GET /auth/me                              | Authenticated          | Own safe profile                                                  |
| GET/PATCH /users/:id                      | Self only              | Read/update own profile; password change requires currentPassword |
| POST /users/avatar                        | Authenticated          | Multipart file, encrypted personal avatar                         |
| GET /tenants                              | Authenticated          | Workspaces with current role                                      |
| POST /tenants                             | Authenticated          | Create workspace, caller becomes Admin                            |
| GET /tenants/:tenantId                    | Member                 | Workspace details; path/header must match                         |
| PATCH/DELETE /tenants/:tenantId           | Admin                  | Manage workspace                                                  |
| GET /tenants/:tenantId/members            | Admin                  | Safe member directory                                             |
| POST /tenants/:tenantId/invitations       | Admin                  | email + role => token, expiresAt; no email sent                   |
| POST /tenants/invitations/accept          | Authenticated          | token => join invited workspace                                   |
| PATCH /tenants/:tenantId/members/:userId  | Admin                  | Change role to ADMIN/EDITOR/VIEWER                                |
| DELETE /tenants/:tenantId/members/:userId | Admin                  | Remove membership                                                 |
| GET /categories                           | Member                 | Workspace categories                                              |
| POST/PATCH /categories[/:id]              | Admin/Editor           | Create/edit category                                              |
| DELETE /categories/:id                    | Admin                  | Delete category, unlink references                                |
| GET /contents[/:id]                       | Member                 | Paginated list or record; safe author fields                      |
| POST/PATCH /contents[/:id]                | Admin/Editor           | Create/edit DRAFT or PUBLISHED content                            |
| DELETE /contents/:id                      | Admin                  | Delete content                                                    |
| GET /media                                | Member                 | Workspace files                                                   |
| POST /media/upload                        | Admin/Editor           | Multipart file up to 5 MiB                                        |
| DELETE /media/:id                         | Admin/Editor           | Delete file record and stored bytes                               |
| GET /media-files/:filename                | Member or avatar owner | Authenticated file bytes                                          |
| GET /analytics/dashboard                  | Member                 | Real counts and recent content                                    |
| GET /audit-logs                           | Admin                  | page, limit (max 100), action, entity, userId                     |
| POST /export/logs                         | Admin                  | startDate/endDate => HTTP 202, data.jobId                         |
| GET /export/status/:jobId                 | Requesting Admin       | data.status/progress; Pending/Processing/Completed/Failed         |
| GET /export/download/:jobId               | Requesting Admin       | Decrypted ZIP of tenant audit NDJSON                              |
| GET /health                               | Public                 | Database/Redis readiness, 503 if unavailable                      |

Content list query parameters: page, limit, search, status, categoryId. Response includes data and meta with total, page, limit, totalPages. Published is a workflow state; reading still requires workspace authorization.

A media record retains a logical /uploads/<filename> URL for compatibility. API clients retrieve bytes from /api/media-files/<filename>; the admin maps URLs to its same-origin /api/files/<filename> route. Old public upload endpoints are disabled. Avatar retrieval does not require tenant context but does require the owning user's token.

Export dates are UTC, with end date inclusive, maximum 366 days. Status metadata expires after 24 hours. Download/status access checks both the current role and requester/tenant ownership. A completed job's storage path is never supplied by the caller.

Legacy global POST/GET /users and DELETE /users/:id return 403. Use registration and tenant memberships. There is no global user directory available to a workspace administrator.

Validation failures use 400, unauthenticated requests 401, insufficient permissions 403, absent or inaccessible individual resources 404, duplicate/conflicting changes 409, and auth rate limits 429. A generic 500 response does not disclose internal error messages.

Authentication requests normalize email by trimming whitespace and lowercasing it (maximum 254 characters). New passwords require 15 or more Unicode code points and at most 72 UTF-8 bytes; passwords are never trimmed. Existing passwords remain accepted by login, capped at 1024 characters. These new-password rules also apply to profile password changes. Registration responds with `{ "message": "Registration request received. You can now try signing in." }` for both account creation and an already-registered email; it does not replace an existing account's password. All successful authentication responses have `Cache-Control: no-store`. Authentication rate limiting responds with 429 and `Retry-After: 60`.
