import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { createServer, Server } from 'node:http';
import { statfs } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Dependency, TelemetryService } from './telemetry.service';

type Backlog = { status: string; count: bigint; oldest: Date | null; expired: bigint };
@Injectable()
export class OperationalHealthService implements OnApplicationBootstrap, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private server?: Server;
  private readonly pending = new Map<Dependency, Promise<unknown>>();
  readonly intervalMs = Number(process.env.OBSERVABILITY_SAMPLE_INTERVAL_MS || 15000);
  constructor(
    private readonly telemetry: TelemetryService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async probe(dependency: Dependency, work: () => Promise<unknown>) {
    // A timeout cannot cancel every driver operation. Never enqueue another while it remains outstanding.
    if (this.pending.has(dependency)) return;
    const started = performance.now();
    const task = Promise.resolve().then(work);
    this.pending.set(dependency, task);
    void task.finally(() => this.pending.delete(dependency)).catch(() => undefined);
    let timeout: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        task,
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Probe deadline')), 2500);
        }),
      ]);
      this.telemetry.dependency(dependency, true);
    } catch {
      this.telemetry.dependency(dependency, false);
    } finally {
      clearTimeout(timeout);
      this.telemetry.probeDuration.observe({ dependency }, (performance.now() - started) / 1000);
    }
  }

  async sample() {
    await Promise.all([
      this.probe('database', async () => {
        const rows = await this.prisma.$transaction(
          async (tx) => {
            await tx.$executeRaw`SET LOCAL statement_timeout = '2000ms'`;
            return tx.$queryRaw<Backlog[]>`SELECT status, count(*)::bigint AS count,
            min("createdAt") AS oldest,
            count(*) FILTER (WHERE status = 'Processing' AND ("leaseUntil" IS NULL OR "leaseUntil" < now()))::bigint AS expired
            FROM "ExportTask" WHERE "expiresAt" > now() GROUP BY status`;
          },
          { maxWait: 1000, timeout: 2200 },
        );
        for (const status of ['Pending', 'Processing', 'Completed', 'Failed'])
          this.telemetry.exportTasks.set(
            { status },
            Number(rows.find((row) => row.status === status)?.count || 0),
          );
        this.telemetry.pendingOldest.set(
          (rows.find((row) => row.status === 'Pending')?.oldest?.getTime() || 0) / 1000,
        );
        this.telemetry.expiredLeases.set(
          Number(rows.find((row) => row.status === 'Processing')?.expired || 0),
        );
      }),
      this.probe('redis', async () => {
        const client = this.redis.getClient();
        if (!client.isReady) throw new Error('Not ready');
        await client.ping();
      }),
      this.probe('storage', async () => {
        const stats = await statfs(join(process.cwd(), 'storage'));
        this.telemetry.vaultAvailable.set(stats.bavail * stats.bsize);
        this.telemetry.vaultSize.set(stats.blocks * stats.bsize);
        if (!stats.bavail) throw new Error('No vault space');
      }),
    ]);
  }
  async onApplicationBootstrap() {
    if (!this.telemetry.enabled) return;
    const server = (this.server = createServer(async (request, response) => {
      response.setHeader('Cache-Control', 'no-store');
      if (request.method !== 'GET') {
        response.writeHead(405).end();
        return;
      }
      const route = request.url?.split('?')[0];
      try {
        if (route === '/metrics') {
          response.setHeader('Content-Type', this.telemetry.registry.contentType);
          response.end(await this.telemetry.registry.metrics());
          return;
        }
        if (route === '/health/live') {
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ status: 'up' }));
          return;
        }
        if (route === '/health/ready' || route === '/health/worker') {
          const snapshot = this.telemetry.snapshot(this.intervalMs * 3);
          response.writeHead(snapshot.ready ? 200 : 503, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify(snapshot));
          return;
        }
        response.writeHead(404).end();
      } catch {
        response.writeHead(503).end();
      }
    }));
    server.requestTimeout = 5000;
    server.headersTimeout = 5000;
    server.maxConnections = 64;
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(
        Number(process.env.OBSERVABILITY_PORT || 9091),
        process.env.OBSERVABILITY_HOST || '127.0.0.1',
        resolve,
      );
    });
    await this.sample();
    this.timer = setInterval(() => void this.sample(), this.intervalMs);
    this.timer.unref();
  }
  async onModuleDestroy() {
    clearInterval(this.timer);
    const server = this.server;
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
}
