import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from '@prometheus-io/client';
import type { NextFunction, Request, Response } from 'express';

export type Dependency = 'database' | 'redis' | 'broker' | 'consumer' | 'storage';
export type WorkerOutcome = 'completed' | 'failed' | 'retry' | 'skipped' | 'stale' | 'draining';

/** No URL, tenant, user, job, SQL, error-message or credential labels. */
@Injectable()
export class TelemetryService implements OnModuleDestroy {
  readonly registry = new Registry();
  readonly enabled = process.env.OBSERVABILITY_ENABLED === 'true';
  draining = false;
  private httpActive = 0;
  private workerActive = 0;
  private dispatchActive = 0;
  private readonly states = new Map<Dependency, { up: boolean; checkedAt: number }>();
  private readonly registers = [this.registry];
  readonly httpRequests = new Counter({
    name: 'atlas_http_requests_total',
    help: 'Completed HTTP requests.',
    labelNames: ['method', 'route', 'status_class'] as const,
    registers: this.registers,
  });
  readonly httpDuration = new Histogram({
    name: 'atlas_http_request_duration_seconds',
    help: 'HTTP request duration including guards and failures.',
    labelNames: ['method', 'route'] as const,
    buckets: [0.005, 0.025, 0.1, 0.25, 0.5, 1, 2, 5, 10],
    registers: this.registers,
  });
  readonly httpInflight = new Gauge({
    name: 'atlas_http_inflight',
    help: 'Active HTTP requests.',
    registers: this.registers,
  });
  readonly dependencyUp = new Gauge({
    name: 'atlas_dependency_up',
    help: 'Latest dependency observation; consult its check timestamp for freshness.',
    labelNames: ['dependency'] as const,
    registers: this.registers,
  });
  readonly dependencyCheckedAt = new Gauge({
    name: 'atlas_dependency_last_check_timestamp_seconds',
    help: 'Last completed dependency observation.',
    labelNames: ['dependency'] as const,
    registers: this.registers,
  });
  readonly probeDuration = new Histogram({
    name: 'atlas_dependency_probe_duration_seconds',
    help: 'Bounded dependency probe duration.',
    labelNames: ['dependency'] as const,
    buckets: [0.005, 0.025, 0.1, 0.5, 1, 2, 3],
    registers: this.registers,
  });
  readonly dbDuration = new Histogram({
    name: 'atlas_db_operation_duration_seconds',
    help: 'Prisma operation duration including client queue wait; not a separate pool-wait measurement.',
    labelNames: ['model', 'operation'] as const,
    buckets: [0.001, 0.005, 0.025, 0.1, 0.5, 1, 5, 15],
    registers: this.registers,
  });
  readonly dbInflight = new Gauge({
    name: 'atlas_db_inflight_operations',
    help: 'Prisma operations currently awaiting completion.',
    registers: this.registers,
  });
  readonly cacheAccess = new Counter({
    name: 'atlas_cache_access_total',
    help: 'Response cache lookups and failures.',
    labelNames: ['outcome'] as const,
    registers: this.registers,
  });
  readonly exportTasks = new Gauge({
    name: 'atlas_export_tasks',
    help: 'Unexpired export records by state; repeated per API instance, aggregate with max.',
    labelNames: ['status'] as const,
    registers: this.registers,
  });
  readonly pendingOldest = new Gauge({
    name: 'atlas_export_oldest_pending_timestamp_seconds',
    help: 'Oldest unexpired Pending creation timestamp; zero when none.',
    registers: this.registers,
  });
  readonly expiredLeases = new Gauge({
    name: 'atlas_export_expired_leases',
    help: 'Unexpired Processing records with missing or expired lease.',
    registers: this.registers,
  });
  readonly dispatchTotal = new Counter({
    name: 'atlas_export_dispatch_total',
    help: 'Outbox poll outcomes.',
    labelNames: ['outcome'] as const,
    registers: this.registers,
  });
  readonly dispatchTick = new Gauge({
    name: 'atlas_export_dispatch_last_tick_timestamp_seconds',
    help: 'Last outbox poll start; independent of traffic.',
    registers: this.registers,
  });
  readonly dispatchSuccess = new Gauge({
    name: 'atlas_export_dispatch_last_success_timestamp_seconds',
    help: 'Last successful outbox poll, including idle polls.',
    registers: this.registers,
  });
  readonly workerTotal = new Counter({
    name: 'atlas_export_worker_total',
    help: 'Delivery outcomes; duplicate deliveries may be skipped.',
    labelNames: ['outcome'] as const,
    registers: this.registers,
  });
  readonly workerDuration = new Histogram({
    name: 'atlas_export_worker_duration_seconds',
    help: 'Delivery handler duration.',
    labelNames: ['outcome'] as const,
    buckets: [0.01, 0.1, 1, 5, 30, 60, 180, 300, 600],
    registers: this.registers,
  });
  readonly workerInflight = new Gauge({
    name: 'atlas_export_worker_inflight',
    help: 'Active delivery handlers.',
    registers: this.registers,
  });
  readonly vaultAvailable = new Gauge({
    name: 'atlas_vault_available_bytes',
    help: 'Available bytes on the vault filesystem.',
    registers: this.registers,
  });
  readonly vaultSize = new Gauge({
    name: 'atlas_vault_size_bytes',
    help: 'Total bytes on the vault filesystem.',
    registers: this.registers,
  });
  readonly retentionErrors = new Counter({
    name: 'atlas_retention_errors_total',
    help: 'Retention collector failures, including dry-run.',
    registers: this.registers,
  });
  readonly shutdownTotal = new Counter({
    name: 'atlas_shutdown_total',
    help: 'Shutdown drain outcomes.',
    labelNames: ['outcome'] as const,
    registers: this.registers,
  });
  readonly drainingGauge = new Gauge({
    name: 'atlas_draining',
    help: 'One after drain starts; new work is rejected.',
    registers: this.registers,
  });

  constructor() {
    for (const dependency of ['database', 'redis', 'broker', 'consumer', 'storage'] as const) {
      this.dependencyUp.set({ dependency }, 0);
      this.dependencyCheckedAt.set({ dependency }, 0);
    }
    for (const outcome of ['completed', 'failed', 'retry', 'skipped', 'stale', 'draining'])
      this.workerTotal.inc({ outcome }, 0);
    this.dispatchTick.set(Date.now() / 1000);
    this.dispatchSuccess.set(0);
    this.drainingGauge.set(0);
    if (this.enabled) collectDefaultMetrics({ register: this.registry, prefix: 'atlas_' });
  }

  dependency(dependency: Dependency, up: boolean) {
    this.states.set(dependency, { up, checkedAt: Date.now() });
    this.dependencyUp.set({ dependency }, up ? 1 : 0);
    this.dependencyCheckedAt.set({ dependency }, Date.now() / 1000);
  }

  snapshot(maxAgeMs: number) {
    const checks = Object.fromEntries(
      (['database', 'redis', 'storage'] as const).map((name) => {
        const state = this.states.get(name);
        return [name, !!state?.up && Date.now() - state.checkedAt < maxAgeMs];
      }),
    );
    // Connection/channel events remain valid until a disconnect/close event.
    checks.broker = this.states.get('broker')?.up === true;
    checks.consumer = this.states.get('consumer')?.up === true;
    const dispatchFresh = Date.now() / 1000 - this.lastDispatchAt < 90000 / 1000;
    return {
      ready: !this.draining && Object.values(checks).every(Boolean) && dispatchFresh,
      draining: this.draining,
      checks,
      dispatchFresh,
      activeHandlers: this.workerActive,
    };
  }
  private lastDispatchAt = Date.now() / 1000;
  dispatchStarted() {
    this.dispatchActive++;
    this.lastDispatchAt = Date.now() / 1000;
    this.dispatchTick.set(this.lastDispatchAt);
  }
  dispatchFinished() {
    this.dispatchActive--;
  }
  beginDrain() {
    this.draining = true;
    this.drainingGauge.set(1);
  }
  async waitForIdle(timeoutMs: number) {
    const deadline = Date.now() + timeoutMs;
    while (this.httpActive || this.workerActive || this.dispatchActive) {
      if (Date.now() >= deadline) return false;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return true;
  }
  workerStarted() {
    this.workerActive++;
    this.workerInflight.set(this.workerActive);
    const started = performance.now();
    return (outcome: WorkerOutcome) => {
      this.workerActive--;
      this.workerInflight.set(this.workerActive);
      this.workerTotal.inc({ outcome });
      this.workerDuration.observe({ outcome }, (performance.now() - started) / 1000);
    };
  }
  middleware = (req: Request, res: Response, next: NextFunction) => {
    this.httpActive++;
    this.httpInflight.set(this.httpActive);
    const started = performance.now();
    let recorded = false;
    const record = () => {
      if (recorded) return;
      recorded = true;
      this.httpActive--;
      this.httpInflight.set(this.httpActive);
      const method = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(
        req.method,
      )
        ? req.method
        : 'OTHER';
      const route = typeof req.route?.path === 'string' ? req.route.path : 'unmatched';
      const status_class = res.writableFinished ? `${Math.floor(res.statusCode / 100)}xx` : '4xx';
      this.httpRequests.inc({ method, route, status_class });
      this.httpDuration.observe({ method, route }, (performance.now() - started) / 1000);
    };
    res.once('finish', record);
    res.once('close', record);
    if (this.draining) {
      res.status(503).json({ message: 'Service is draining.' });
      return;
    }
    next();
  };
  onModuleDestroy() {
    this.registry.clear();
  }
}
