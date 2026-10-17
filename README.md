# ContentDock

ContentDock is a multi-tenant headless CMS with a Next.js administration interface and a NestJS API. Manage content, private media, workspace members, audit history, and asynchronous audit exports from one workspace.

## Features

- **Workspaces:** create and switch organizations, update settings, and manage Admin, Editor, and Viewer access.
- **Authentication:** registration, login, refresh rotation, HTTP-only session cookies, profile, avatar, and password changes.
- **Content:** rich-text editing, categories, draft/published status, search, filters, and server pagination.
- **Media:** image/PDF uploads, authenticated previews/downloads, and encrypted file storage.
- **Members:** shareable invitations valid for seven days, role changes, and removal of workspace access.
- **Audit and exports:** filtered activity history and tenant/date-bounded ZIP exports processed through RabbitMQ, with progress tracking and requester-only downloads.
- **Operations:** health checks, optional Prometheus/Grafana monitoring, retention tooling, and operational runbooks.
- **Interface:** responsive light/dark themes and built-in user guides at `/docs`.

Invitations do not send email automatically. Password recovery email, billing, GraphQL, and content revision history are not implemented. Workspace domains are identifiers; entering one does not configure DNS.

## Stack

| Layer          | Technology                                       |
| -------------- | ------------------------------------------------ |
| Admin          | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| API            | NestJS 11, Prisma 5, JWT, Swagger/OpenAPI        |
| Infrastructure | PostgreSQL 15, Redis 7, RabbitMQ 3               |
| Tooling        | npm workspaces, Turborepo, Jest, Playwright      |
| Deployment     | Docker Compose, Nginx, optional Caddy TLS        |

## Local development

Prerequisites: **Node.js 24** (see `.node-version`), **npm 10.9.9**, and Docker with Compose. The supported Node range is declared in `package.json`. Run commands from the repository root unless stated otherwise.

1. Install dependencies and copy the environment examples:

   ```sh
   npm ci
   cp apps/api/.env.example apps/api/.env
   cp apps/web-admin/.env.example apps/web-admin/.env.local
   ```

   On PowerShell, `Copy-Item` also works. Use `npm.cmd` / `npx.cmd` if PowerShell blocks npm scripts.

2. Set distinct `JWT_SECRET` and `JWT_REFRESH_SECRET` values in `apps/api/.env`, each at least 32 characters. For example, generate each value separately:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   The example database, Redis, and RabbitMQ URLs match the local Compose services. The frontend uses `API_URL=http://localhost:4000/api`.

3. Start infrastructure and generate the database client:

   ```sh
   docker compose up -d
   npm run prisma:generate --workspace=@atlas/api
   ```

4. Apply committed migrations from `apps/api`, then return to the repository root:

   ```sh
   cd apps/api
   npx prisma migrate deploy
   cd ../..
   npm run dev
   ```

| Service             | Local address                  |
| ------------------- | ------------------------------ |
| Admin               | http://localhost:3000          |
| User guides         | http://localhost:3000/docs     |
| API                 | http://localhost:4000/api      |
| Swagger             | http://localhost:4000/api/docs |
| RabbitMQ management | http://localhost:15672         |

Register an account, create a workspace, and invite teammates from **Members**. Infrastructure binds to loopback. If a port is occupied, adjust the Compose mapping and corresponding environment URL.

### Troubleshooting startup

- **`Another next dev server is already running`:** stop the previous development command with `Ctrl+C` in its terminal, then run `npm run dev` once from the root. This command starts both workspaces; do not also start a second frontend command. Next.js prints the existing server's URL and PID if a duplicate is detected.
- **`Cannot find module .../apps/api/dist/main`:** the compiled API entry point is missing. For development, use the root `npm run dev`, which compiles the API in watch mode. For production-style local startup, first run `npm run build --workspace=@atlas/api`, then `npm run start:prod --workspace=@atlas/api`. Avoid running an API build alongside its development watcher because both use `apps/api/dist`.
- **Custom API ports:** set the frontend's `API_URL` to the API's configured `PORT`, including the `/api` prefix. The addresses above describe the example environment; existing local environment files may use different ports.

## Repository layout

| Path                 | Purpose                                                                       |
| -------------------- | ----------------------------------------------------------------------------- |
| `apps/api/src`       | API modules, authorization, queue worker, encrypted file vault                |
| `apps/api/prisma`    | Database schema and committed migrations                                      |
| `apps/api/test`      | Unit, contract, integration, and API end-to-end tests                         |
| `apps/web-admin/src` | Admin interface, user guides, server actions, authentication proxy            |
| `apps/api/docs`      | Architecture, API contract, security, testing, and release notes              |
| `tests/browser`      | Playwright browser and accessibility checks                                   |
| `scripts`            | Database provisioning, regression checks, benchmarks, and maintenance         |
| `ops`                | Observability configuration and dependency lifecycle policy                   |
| `docs/improvements`  | Improvement reports, operational guides, and historical verification evidence |

Use the **root `package-lock.json`** for both workspaces. Install dependencies from the root to keep local, CI, and Docker dependency resolution consistent.

## Validation

```sh
npm run lint
npm run typecheck
npm run test:contracts
npm run test:cov --workspace=@atlas/api -- --runInBand
npm run build
```

Integration, API end-to-end, and browser tests require isolated test infrastructure. Follow the [test strategy](apps/api/docs/TEST_STRATEGY.md) before running them; database cleanup helpers reject normal database names.

Additional commands are in `package.json`, including `test:security`, `test:observability`, `test:browser`, `audit:dependencies`, and `maintenance:dependencies`. CI runs the fullstack checks and container builds; the maintenance workflow handles scheduled dependency reviews.

For the authenticated 1,000-read smoke benchmark, run `node scripts/benchmark.mjs` against a separately started test API with `DATABASE_URL` set to its dedicated test database and `E2E_API_URL` set to the API address (default `http://127.0.0.1:4400/api`). Results are generated in `artifacts/benchmark`. See the [performance report](apps/api/docs/PERFORMANCE_REPORT.md) for measured workloads and limitations.

## Production

Copy `.env.production.example` to `.env.production`. Configure database and broker credentials, the restricted `DATABASE_APP_URL`, hostname, and three distinct secrets: `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `AUTH_PROXY_SECRET` (each at least 32 characters).

Set a persistent `STORAGE_ENCRYPTION_KEY` containing 64 hexadecimal characters (32 random bytes). The generation command above produces this format. Back up the key securely alongside the database and encrypted files.

Before startup, follow [database runtime role provisioning](scripts/database/README.md): apply migrations with the owner role, provision or review `atlas_app`, and grant the required `ExportTask` permissions. Existing installations must also review volume names, credentials, and storage migration in the [release notes](apps/api/docs/RELEASE_NOTES.md).

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml --profile tls up -d
```

The TLS profile requires DNS pointing to the server and available ports 80/443. Without it, Nginx is exposed at `127.0.0.1:8080` for local inspection. Production sessions require HTTPS. The migration service runs before the API; production infrastructure has no published PostgreSQL, Redis, or RabbitMQ ports.

Optional monitoring uses `docker-compose.observability.yml`; follow the [observability guide](docs/improvements/phase-4/OBSERVABILITY.md) for configuration. Review staging, backups, and restore procedures before production deployment.

## Repository hygiene

Commit source code, migrations, tests and their fixtures, sanitized environment examples, deployment configuration, and documentation. Git ignores local `.env` variants, dependencies, build output, coverage, temporary browser reports, and generated audit/maintenance reports.

Historical verification evidence under `docs/improvements`, the documentation screenshots in `artifacts/docs`, and the security evidence in `artifacts/security-phase2` are retained because project reports refer to them. New generated reports should stay in ignored output directories or be deliberately curated as documentation evidence.

## Documentation

- [Architecture and fullstack diagram](apps/api/docs/ARCHITECTURE.md)
- [API contract](apps/api/docs/API_SPECIFICATION.md)
- [Security boundaries](apps/api/docs/SECURITY.md)
- [Test strategy](apps/api/docs/TEST_STRATEGY.md)
- [Design decisions](apps/api/docs/DECISION_LOG.md)
- [Release and upgrade notes](apps/api/docs/RELEASE_NOTES.md)
- [Development roadmap and historical verification](DEVELOPMENT.md)
- [Operational metrics and dashboard](docs/improvements/phase-4/OBSERVABILITY.md)
- [Incident and resilience runbooks](docs/improvements/phase-4/OPERATIONAL-RUNBOOKS.md)
- [Maintenance and dependency lifecycle](docs/improvements/phase-4/LONG-TERM-MAINTENANCE.md)
- [Retention policy](docs/improvements/phase-4/RETENTION-POLICY.md)
- [Browser and accessibility verification](docs/improvements/phase-4/BROWSER-ACCESSIBILITY.md)

Licensed under [MIT](LICENSE).
