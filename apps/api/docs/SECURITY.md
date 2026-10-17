# Security boundaries

## Workspace authorization

Tenant resources require an access token and X-Tenant-ID. Every guarded request loads current membership from PostgreSQL; cached content never bypasses authorization. Tenant route parameters must match that context. Cross-tenant resources return 403 or 404. Administrators manage workspace memberships, not global user accounts. Profile endpoints are self-only.

| Action                                     | Admin | Editor | Viewer |
| ------------------------------------------ | ----- | ------ | ------ |
| Read content, categories, media, overview  | Yes   | Yes    | Yes    |
| Create/edit/publish content and categories | Yes   | Yes    | No     |
| Delete content or categories               | Yes   | No     | No     |
| Upload/delete media                        | Yes   | Yes    | No     |
| Manage settings, members, audit, exports   | Yes   | No     | No     |

Membership changes lock the workspace row in a transaction. Self-demotion/removal is refused; another administrator must make the change. Invitations use random 256-bit tokens, hashed Redis keys, a seven-day expiry, recipient account-email matching, and issuer role checks. Email delivery and email ownership verification are not configured; share links only through a trusted channel.

## Sessions and credentials

The admin uses HTTP-only, SameSite=Lax cookies, secure in production. Browser JavaScript does not access tokens. The API uses signed access and refresh JWTs. Refresh JWTs are SHA-256 digested before bcrypt; rotation uses a distributed lock and conditional database update. Concurrent refresh requests share a five-second result, checked against the current persisted token hash. Logout and password change invalidate refresh access immediately; an already issued access token remains valid until its expiry (default 15 minutes).

Password changes require the existing password. Password recovery email is deliberately not simulated. The login/register API applies atomic Redis limits of 30 attempts/minute per IP and normalized account hash. Web server actions sign client identity using the separate AUTH_PROXY_SECRET; unsigned or stale identity falls back to the API-observed peer. The edge overwrites client-supplied forwarding headers. Nginx adds an ingress limit for direct auth calls. Persistent account lockout, MFA, breached-password detection, and SSO remain future work.

New passwords (registration and profile changes) require at least 15 Unicode code points and at most 72 UTF-8 bytes, matching the existing bcrypt limit without silent truncation. Spaces, Unicode, paste, autofill, and password managers are supported. New password hashes use bcrypt cost 12; existing hashes and shorter legacy passwords remain usable for login. Login accepts at most 1024 characters. Email is trimmed and lowercased on login, registration, and profile updates. Authentication looks up historical mixed-case addresses case-insensitively, and registration refuses to create a second identity for them. If historical rows differ only by email casing, login fails closed until an operator resolves that collision; no existing rows are rewritten automatically.

Public registration returns HTTP 201 and the same message for new and existing emails, with no user identifiers or session tokens. Every registration hashes the submitted password before an atomic insert with duplicate skipping; duplicate requests never change an existing password. The new user's ID is retained only on the server for audit attribution. Unknown-account login still performs a cost-12 bcrypt comparison and returns the same credential error as a wrong password; this reduces timing discrepancies but does not guarantee constant end-to-end response time, especially for legacy hashes with different costs.

Authentication responses specify `Cache-Control: no-store`. Server actions validate string inputs before network calls, use uncached requests with a ten-second timeout, return only allowlisted status-based messages, and check that both tokens are present before writing session cookies. Passwords are never returned in action state or logged with transport exceptions. Redirects are confined to normalized dashboard paths. Password visibility controls are keyboard-accessible and hide the value on leaving the field; submitted password fields reset on an error, while normalized email and persistent field errors remain available.

These controls are a security baseline, not enterprise certification. Production acceptance still requires email ownership verification, MFA or an enterprise identity provider, a maintained breached-password blocklist, and an environment-specific security assessment. Password-only public signup must not be treated as proof that the registrant owns the supplied email address.

JWT verification pins HS256, issuer, audience and access/refresh purpose. Access and refresh secrets must be distinct and at least 32 characters; production also requires a distinct AUTH_PROXY_SECRET. Database mutations and their audit entries commit together. Cache invalidation follows commit; a Redis invalidation failure can leave cached reads stale for their remaining 60-second TTL and is logged.

Logs redact Authorization, Cookie, Set-Cookie, password and token fields. Audit metadata records changed field names rather than raw request values. Content author responses exclude credential fields. Unknown server exceptions return a generic message.

## Files and exports

New media, avatars, and archives use AES-256-GCM. Production requires STORAGE_ENCRYPTION_KEY: 64 hexadecimal characters. Keep the key stable and back it up separately with access controls. Encryption is for stored files; HTTPS remains necessary in transit. Full database field encryption is not provided.

There is no public /uploads route. File delivery requires membership in the file's workspace, or ownership of a personal avatar. Responses set no-store, nosniff, and a sandbox CSP. Media accepts JPEG/PNG/GIF/WebP/PDF up to 5 MiB; avatars JPEG/PNG/WebP up to 2 MiB. File type checks currently rely on the upload MIME type; antivirus and file-content inspection are not implemented.

Exports require Admin and are bound to both tenant and requesting user. The selected UTC end date is inclusive. A request spans at most 366 days. Download uses a validated job UUID; clients cannot choose a filesystem path. Status expires in Redis after 24 hours. Encrypted archive retention must be configured operationally; files are not automatically purged yet.

## Operations

Production compose keeps PostgreSQL, Redis, and RabbitMQ internal. Use the Caddy TLS profile or a trusted HTTPS ingress. Configure CORS_ORIGINS, JWT secrets, broker/database credentials, and the storage key outside version control. Enable TRUST_PROXY only behind the trusted ingress.

The application exposes structured logs and database/Redis readiness. This is not a SIEM integration or a certification of regulatory compliance. Production release needs environment-specific backup/restore, TLS, retention, access review, and sustained load verification.
