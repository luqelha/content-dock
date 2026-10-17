import { deferred } from '../deferred';
import { EventEmitter } from 'node:events';
import { ServerRMQ } from '@nestjs/microservices';
import { TelemetryService } from '../../src/modules/observability/telemetry.service';
import { OperationalHealthService } from '../../src/modules/observability/operational-health.service';
import { ObservedRmqServer } from '../../src/modules/observability/observed-rmq.server';
import { WorkerController } from '../../src/modules/export/worker.controller';

jest.mock('../../src/modules/export/compression.service', () => ({ CompressionService: class {} }));

describe('Operational health and bounded telemetry', () => {
  let telemetry: TelemetryService;
  beforeEach(() => {
    telemetry = new TelemetryService();
  });
  afterEach(() => {
    telemetry.onModuleDestroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('counts 404s and failures without putting user-controlled URLs or headers into labels', async () => {
    const response = Object.assign(new EventEmitter(), { statusCode: 404, writableFinished: true });
    const next = jest.fn();
    telemetry.middleware(
      {
        method: 'GET',
        originalUrl: '/missing/user-secret?q=jwt-secret',
        headers: { authorization: 'secret' },
      } as any,
      response as any,
      next,
    );
    response.emit('finish');
    response.emit('close');
    const text = await telemetry.registry.metrics();
    expect(text).toContain('route="unmatched"');
    expect(text).toContain('status_class="4xx"} 1');
    expect(text).not.toMatch(/user-secret|jwt-secret|authorization/);
    expect(next).toHaveBeenCalledTimes(1);
    expect(text).toContain('atlas_http_inflight 0');
  });

  it('does not infer consumer readiness from a broker TCP connection', () => {
    for (const dependency of ['database', 'redis', 'storage', 'broker'] as const)
      telemetry.dependency(dependency, true);
    expect(telemetry.snapshot(45000).ready).toBe(false);
    telemetry.dependency('consumer', true);
    expect(telemetry.snapshot(45000).ready).toBe(true);
    telemetry.beginDrain();
    expect(telemetry.snapshot(45000).ready).toBe(false);
  });

  it('marks stale probe snapshots unready even without a new error', () => {
    jest.useFakeTimers();
    for (const dependency of ['database', 'redis', 'storage', 'broker', 'consumer'] as const)
      telemetry.dependency(dependency, true);
    jest.advanceTimersByTime(45001);
    expect(telemetry.snapshot(45000).ready).toBe(false);
  });

  it('times out a hung probe and does not queue duplicate driver operations', async () => {
    jest.useFakeTimers();
    const pending = deferred<void>();
    const release = () => pending.resolve();
    const work = jest.fn(() => pending.promise);
    const service = new OperationalHealthService(telemetry, {} as any, {} as any);
    const attempt = service.probe('database', work);
    await jest.advanceTimersByTimeAsync(2501);
    await attempt;
    await service.probe('database', work);
    expect(work).toHaveBeenCalledTimes(1);
    expect(telemetry.snapshot(45000).checks.database).toBe(false);
    release();
    await Promise.resolve();
    await Promise.resolve();
    await service.probe('database', async () => undefined);
    expect(telemetry.snapshot(45000).checks.database).toBe(true);
  });

  it('waits for deliveries and dispatches before shutdown, and enforces its grace limit', async () => {
    const finish = telemetry.workerStarted();
    telemetry.dispatchStarted();
    expect(await telemetry.waitForIdle(1)).toBe(false);
    finish('completed');
    expect(await telemetry.waitForIdle(1)).toBe(false);
    telemetry.dispatchFinished();
    expect(await telemetry.waitForIdle(1)).toBe(true);
  });

  it('does not let a late close from an old consumer channel invalidate its replacement', async () => {
    jest
      .spyOn(ServerRMQ.prototype, 'setupChannel')
      .mockImplementation(async (_channel, callback) => {
        callback();
      });
    const server = new ObservedRmqServer({ urls: ['amqp://localhost'], queue: 'test' }, telemetry);
    const oldChannel = new EventEmitter();
    const newChannel = new EventEmitter();
    await server.setupChannel(oldChannel, jest.fn());
    await server.setupChannel(newChannel, jest.fn());
    oldChannel.emit('close');
    expect(telemetry.snapshot(45000).checks.consumer).toBe(true);
    newChannel.emit('close');
    expect(telemetry.snapshot(45000).checks.consumer).toBe(false);
    await server.close();
  });

  it('blocks new HTTP work during drain while releasing its in-flight gauge', async () => {
    telemetry.beginDrain();
    const response = Object.assign(new EventEmitter(), {
      statusCode: 503,
      writableFinished: true,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    });
    const next = jest.fn();
    telemetry.middleware({ method: 'POST' } as any, response as any, next);
    response.emit('finish');
    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(503);
    expect(await telemetry.waitForIdle(1)).toBe(true);
  });
});

describe('Worker instrumentation preserves fencing and settlement', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  let telemetry: TelemetryService;
  let prisma: any;
  let compression: any;
  let channel: any;
  const task = {
    id,
    tenantId: 'tenant',
    userId: 'owner',
    payload: {
      jobId: id,
      tenantId: 'tenant',
      userId: 'owner',
      startDate: '2026-10-01',
      endDate: '2026-10-11',
      createdAt: '2026-10-01T00:00:00.000Z',
      status: 'Pending',
      progress: 0,
    },
  };
  beforeEach(() => {
    telemetry = new TelemetryService();
    prisma = {
      exportTask: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(task),
      },
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: 'tenant' }) },
    };
    compression = {
      compressLogs: jest.fn().mockResolvedValue({ zipName: 'archive.zip', size: 1 }),
      removeArchive: jest.fn().mockResolvedValue(undefined),
    };
    channel = { ack: jest.fn(), nack: jest.fn() };
  });
  afterEach(() => telemetry.onModuleDestroy());
  const context = () => ({ getChannelRef: () => channel, getMessage: () => ({}) }) as any;
  it.each(['completed', 'failed', 'stale', 'retry', 'skipped', 'draining'] as const)(
    'records %s without retaining job/tenant labels',
    async (outcome) => {
      if (outcome === 'failed' || outcome === 'stale')
        compression.compressLogs.mockRejectedValue(new Error('synthetic ENOSPC'));
      if (outcome === 'stale')
        prisma.exportTask.updateMany
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 0 });
      if (outcome === 'retry')
        prisma.exportTask.updateMany.mockRejectedValue(new Error('DB unavailable'));
      if (outcome === 'draining') telemetry.beginDrain();
      const worker = new WorkerController(compression, prisma, telemetry);
      await worker.handleLogExport(
        outcome === 'skipped' ? null : ({ jobId: id } as any),
        context(),
      );
      const text = await telemetry.registry.metrics();
      expect(text).toContain(`atlas_export_worker_total{outcome="${outcome}"} 1`);
      expect(text).toContain('atlas_export_worker_inflight 0');
      expect(text).not.toContain(id);
      if (outcome === 'draining') expect(prisma.exportTask.updateMany).not.toHaveBeenCalled();
    },
  );
});
