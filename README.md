# Atlas Platform

A multi-tenant headless CMS with an ERP-style administrative workspace. Atlas provides content publishing, categories, private media, member access, audit history, and asynchronous audit exports. The interface retains the existing neutral light/dark theme.

## Run locally

Use Node.js 22.12+ (the container and CI use Node 24), npm, and Docker Desktop.

```sh
npm ci
cp apps/api/.env.example apps/api/.env
cp apps/web-admin/.env.example apps/web-admin/.env.local
docker compose up -d
npm run prisma:generate --workspace=@atlas/api
```

Set unique JWT secrets in `apps/api/.env`. From `apps/api`, apply the migrations with `npx prisma migrate deploy`, then return to the repository root and run:

```sh
npm run dev
```

On Windows PowerShell, use `Copy-Item` instead of `cp` if preferred and `npm.cmd` / `npx.cmd` if script execution is disabled. The web app runs at **http://localhost:3000**, the API at **http://localhost:4000/api**, and Swagger at **http://localhost:4000/api/docs**. Infrastructure ports must be free; do not stop unrelated applications to reuse a port. Adapt the compose mapping and environment variables if necessary.

Register an account, create a workspace, and invite teammates from **Members**. Invitations are shareable links, valid for seven days. No email is sent automatically. An account can belong to multiple workspaces with different roles.

## Working features

- **Overview:** live content, publication, media, and membership counts with recent records.
- **Content:** rich text, categories, draft/published status, search, filters, and server pagination.
- **Media:** image/PDF uploads, authenticated previews/downloads, encrypted storage, and deletion.
- **Members:** invite, change role, or remove workspace access without exposing global user credentials.
- **Audit:** action/entity filters, pagination, and metadata that excludes credentials and content bodies.
- **Exports:** date-bounded tenant audit ZIPs, RabbitMQ processing, progress polling, and owner-only downloads.
- **Settings:** persisted workspace name/domain, profile, avatar, and password changes.
- **Access:** Admin, Editor, and Viewer permissions enforced by both server and interface.

The workspace domain is an identifier; entering it does not configure DNS. Password recovery email, public asset delivery, billing, GraphQL, and revision history are not implemented or advertised as working features.

## Repository

| Path                   | Responsibility                                               |
| ---------------------- | ------------------------------------------------------------ |
| `apps/api/src`         | NestJS modules, guards, queue worker, private file vault     |
| `apps/api/prisma`      | PostgreSQL schema and versioned migrations                   |
| `apps/api/test`        | Unit, integration, and API end-to-end tests                  |
| `apps/web-admin/src`   | Next.js interface, server actions, authentication proxy      |
| `scripts`              | Reproducible API load smoke test                            |
| `apps/api/docs`        | Architecture, API contract, security, tests, release notes   |

## Validation

```sh
npm run lint
npm run build
npm run test:cov --workspace=@atlas/api -- --runInBand
```

Integration/API tests need a **dedicated test database**. Follow [TEST_STRATEGY.md](apps/api/docs/TEST_STRATEGY.md); the database cleanup helpers refuse normal database names. With the API and its infrastructure running against that database, `node scripts/benchmark.mjs` measures 1,000 authenticated reads and saves timings in `artifacts/benchmark`. Set `E2E_API_URL` to the test API URL (default: `http://127.0.0.1:4400/api`).

See [PERFORMANCE_REPORT.md](apps/api/docs/PERFORMANCE_REPORT.md) for the actual measured workload and its limits. Local results do not establish a production availability SLA.

## Production preparation

Copy `.env.production.example` to `.env.production`, configure credentials, hostname, and a persistent 32-byte storage encryption key (64 hexadecimal characters). Generate a key with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Back up that key securely with the database and files.

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml build
```

Before starting the API, follow [runtime role provisioning](scripts/database/README.md): apply the additive migrations with the owner, provision or review `atlas_app`, grant the new `ExportTask` permissions, and verify `DATABASE_APP_URL` uses that restricted role. Configure distinct JWT secrets and `AUTH_PROXY_SECRET` (each at least 32 characters). After staging verification and deployment approval, start the reviewed stack with `docker compose --env-file .env.production -f docker-compose.prod.yml --profile tls up -d`.

The TLS profile requires DNS pointing to the server and available ports 80/443. Without that profile, Nginx is available only on `127.0.0.1:8080` for local inspection. Production session cookies require HTTPS except for browser loopback exceptions. The migration service runs before the API. PostgreSQL, Redis, and RabbitMQ have no published production ports.

Existing installations must review volume names, credentials, and storage migration before running the new compose definition. See [release upgrade notes](apps/api/docs/RELEASE_NOTES.md). CI validates code and container builds; it does not deploy or publish GitHub releases automatically.

## Documentation

- [Implementation roadmap](DEVELOPMENT.md)
- [Architecture and fullstack diagram](apps/api/docs/ARCHITECTURE.md)
- [API contract](apps/api/docs/API_SPECIFICATION.md)
- [Security boundaries](apps/api/docs/SECURITY.md)
- [Test strategy](apps/api/docs/TEST_STRATEGY.md)
- [Design decisions](apps/api/docs/DECISION_LOG.md)
- [Release candidate notes](apps/api/docs/RELEASE_NOTES.md)

MIT license: [LICENSE](LICENSE).
