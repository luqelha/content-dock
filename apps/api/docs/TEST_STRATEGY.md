# Validation strategy

## Local checks

Run from the repository root:

```sh
npm run lint
npm run build
npm run test:cov --workspace=@atlas/api -- --runInBand
```

Use npm.cmd/npx.cmd on PowerShell when npm.ps1 is disabled.

## Isolated integration environment

Do not point tests at a real workspace database. Test cleanup truncates test tables; both creation and cleanup helpers require the database name to contain a separated test or review component, such as atlas_test.

```sh
docker compose -p atlas-test -f docker-compose.test.yml up -d
```

Set these environment variables in your test shell (PowerShell example):

```powershell
$env:DATABASE_URL='postgresql://atlas_test:atlas_test@127.0.0.1:55432/atlas_test'
$env:REDIS_URL='redis://127.0.0.1:56379'
$env:RABBITMQ_URL='amqp://guest:guest@127.0.0.1:55672'
$env:NODE_ENV='test'
$env:JWT_SECRET='test-only-access-secret-not-production'
$env:JWT_REFRESH_SECRET='test-only-refresh-secret-not-production'
node apps/api/node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma
npm.cmd run test:int --workspace=@atlas/api
npm.cmd run test:e2e --workspace=@atlas/api
```

Run suites sequentially: integration/API tests clear their database. Test service ports must be free.

## Coverage by layer

- Unit: service/controller behavior, credential exclusion, file encryption, tamper rejection, safe paths, streaming archive round trip.
- Integration: Prisma-backed content/category isolation, filters, pagination, and relationships.
- API end-to-end: Nest routes, real PostgreSQL/Redis, validation, CMS permissions, media upload/deletion. These legacy suites mock queue dependencies.
- Load smoke: 1,000 authenticated warmed content-list reads at concurrency 25. See PERFORMANCE_REPORT.md for measured limits.

Run `node scripts/benchmark.mjs` with `DATABASE_URL` set to the dedicated test database and `E2E_API_URL` pointing to its running API (default: `http://127.0.0.1:4400/api`). Start the API and infrastructure separately; the benchmark verifies loopback, test mode, and database identity before writes. Results appear under `artifacts/benchmark/benchmark.json`.

Run `npm run test:security` for the focused API suite and Node regressions. `npm run test:security:db` additionally requires a separately provisioned `DATABASE_APP_URL` using `atlas_app` in the test database. `node scripts/security/runtime-smoke.cjs` checks real broker delivery, ZIP download and tenant isolation on the running test API. `node scripts/security/proxy-smoke.cjs` uses disposable Docker protocol fixtures without published ports. Do not run database cleanup suites concurrently with these runtime checks.

Browser regressions live in `tests/browser/security-flows.spec.ts`. CI starts isolated servers and runs Chromium; local configuration starts no servers. Local browser verification requires an available browser and a user-started frontend connected to the isolated API. Test discovery is not a passing browser run. CI retains coverage, browser traces and reports for seven days. Unit coverage gates are lines/statements 40%, branches/functions 30%; these are regression floors, not a completeness claim.

## Release criteria

Lint/build and all automated suites must pass. Review screenshots and production container startup. Remote CI, production TLS/DNS, migrations against a restored production backup, disaster recovery, and sustained mixed workload tests must be verified in the release environment. Local pass results do not claim those external checks have occurred.
