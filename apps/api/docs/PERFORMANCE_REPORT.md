# Measured performance

## Phase 4B — 16 October 2026

Local profiling and controlled A/B/B/A measurements cover five tenants, 80,025 content records, 100,000 seeded audit rows, warm/cold response cache, mixed reads/writes, encrypted media reads and real exports. Two measured Content indexes improve dashboard p95 **56.45 → 22.23 ms** and throughput **325.0 → 901.1 req/s** in the steady-state comparison; mixed p95 improves **36.10 → 31.27 ms**. All 29,600 measured HTTP requests succeeded.

See the [Phase 4B report](../../../docs/improvements/phase-4/PHASE-4B-REPORT.md) for evidence, p50/p95/p99, CPU/RSS, index cost, control-workload regressions and reproduction. These are synthetic local results, not a production SLA. The historical result below is retained and is not an equivalent-workload before/after comparison.

## Historical smoke — 12 October 2026

Measured on 12 October 2026 during security remediation. This is a local load smoke test, not a production capacity or availability claim.

## Environment and workload

- Windows, Node.js v22.18.0, Intel Core i5-13450HX.
- Built NestJS API image using restricted `atlas_app`; PostgreSQL, Redis, and RabbitMQ in isolated Docker services.
- One newly created workspace with 25 content records.
- Authenticated GET /api/contents?page=1&take=20, warmed Redis cache.
- 1,000 requests in total, 25 concurrent clients, local loopback network.
- Every request still performs the current membership authorization check.

| Measurement         |              Result |
| ------------------- | ------------------: |
| Successful requests |       1,000 / 1,000 |
| Failures            |                   0 |
| Elapsed time        |            1,797 ms |
| Throughput          | 556 requests/second |
| Median latency      |            37.81 ms |
| p95 latency         |            78.73 ms |
| p99 latency         |           210.71 ms |

The reproducible implementation is scripts/benchmark.mjs. Run `node scripts/benchmark.mjs` against a separately started test API, with `DATABASE_URL` set to the dedicated test database and `E2E_API_URL` set to its API URL (default: `http://127.0.0.1:4400/api`). Machine-readable results are stored in artifacts/benchmark/benchmark.json. No credential or token is included in the report.

## Limits of the result

EXPLAIN ANALYZE on this small fixture used `Content_tenantId_createdAt_idx` and `AuditLog_tenantId_createdAt_idx` for bounded tenant queries. This is evidence of index use, not representative scale testing. The older result used the unsupported `limit` parameter, so its timings are not an equivalent-workload baseline.

This workload is read-heavy, short, cached, and restricted to a single small tenant. It does not measure 1,000 simultaneous clients, cold-cache reads, long-running mixed writes, large exports, WAN latency, failure recovery, storage capacity, or cross-region deployment. The document's response-time and uptime goals require separate sustained production-like measurements. A 99.8% availability claim cannot be established by this test.

Unit coverage reports are generated separately; load smoke success is not a complete security assessment.
