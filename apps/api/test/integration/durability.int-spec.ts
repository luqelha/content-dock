import { of, throwError } from 'rxjs';
import { PrismaService } from '../../src/database/prisma.service';
import { ExportService } from '../../src/modules/export/export.service';
import { WorkerController } from '../../src/modules/export/worker.controller';
import { MediaService } from '../../src/modules/media/media.service';
import { clearDatabase, setupTestTenantAndUser } from './int-test-utils';
import { assertTestDatabase } from '../database-safety';

describe('Durable audit side effects and export outbox (integration)', () => {
  const prisma = new PrismaService();
  const broker = { emit: jest.fn(() => of(undefined)) };
  const service = new ExportService(broker as any, prisma);
  let tenantId: string;
  let userId: string;
  beforeAll(async () => {
    assertTestDatabase();
    await prisma.$connect();
  });
  beforeEach(async () => {
    await clearDatabase(prisma);
    const setup = await setupTestTenantAndUser(prisma);
    tenantId = setup.tenant.id;
    userId = setup.user.id;
    broker.emit.mockReset().mockReturnValue(of(undefined));
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('preserves the file when audit rolls back deletion and removes it only after commit', async () => {
    const file = await prisma.media.create({
      data: { tenantId, url: '/uploads/fixture.png', type: 'image/png' },
    });
    const remove = jest.fn(async () => undefined);
    const media = new MediaService(prisma, { remove } as any);
    await expect(
      prisma.inTransaction(async () => {
        await media.deleteMedia(tenantId, file.id);
        expect(remove).not.toHaveBeenCalled();
        throw new Error('Audit failed');
      }),
    ).rejects.toThrow('Audit failed');
    expect(await prisma.media.findUnique({ where: { id: file.id } })).not.toBeNull();
    expect(remove).not.toHaveBeenCalled();
    await prisma.inTransaction(async () => {
      await media.deleteMedia(tenantId, file.id);
      expect(remove).not.toHaveBeenCalled();
    });
    expect(remove).toHaveBeenCalledWith('fixture.png');
    expect(await prisma.media.findUnique({ where: { id: file.id } })).toBeNull();
  });

  it('runs nested commit callbacks only after commit; rollback cleanup only on failure', async () => {
    const committed = jest.fn(async () => {
      expect(await prisma.tenant.findUnique({ where: { id: tenantId } })).toMatchObject({
        name: 'Committed',
      });
    });
    const rollback = jest.fn(async () => undefined);
    await prisma.inTransaction(async () => {
      await prisma.client.tenant.update({ where: { id: tenantId }, data: { name: 'Committed' } });
      await prisma.inTransaction(async () => {
        await prisma.afterCommit(committed);
        prisma.afterRollback(rollback);
        expect(committed).not.toHaveBeenCalled();
      });
    });
    expect(committed).toHaveBeenCalledTimes(1);
    expect(rollback).not.toHaveBeenCalled();
    await expect(
      prisma.inTransaction(async () => {
        await prisma.afterCommit(committed);
        prisma.afterRollback(rollback);
        await prisma.client.tenant.update({
          where: { id: tenantId },
          data: { name: 'Uncommitted' },
        });
        throw new Error('Audit unavailable');
      }),
    ).rejects.toThrow('Audit unavailable');
    expect(committed).toHaveBeenCalledTimes(1);
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(await prisma.tenant.findUnique({ where: { id: tenantId } })).toMatchObject({
      name: 'Committed',
    });
  });

  it('does not publish or persist an export if audit fails', async () => {
    await expect(
      prisma.inTransaction(async () => {
        await service.createJob('2026-10-01', '2026-10-11', tenantId, userId);
        expect(broker.emit).not.toHaveBeenCalled();
        throw new Error('Audit failed');
      }),
    ).rejects.toThrow('Audit failed');
    expect(await prisma.exportTask.count()).toBe(0);
    expect(broker.emit).not.toHaveBeenCalled();
  });

  it('retains committed jobs through broker failure and retries without Redis', async () => {
    broker.emit.mockReturnValueOnce(throwError(() => new Error('Broker offline')));
    const job = await service.createJob('2026-10-01', '2026-10-11', tenantId, userId);
    expect(await service.getJobStatus(job.jobId, tenantId, userId)).toMatchObject({
      status: 'Pending',
    });
    expect(await prisma.exportTask.findUnique({ where: { id: job.jobId } })).toMatchObject({
      dispatchedAt: null,
    });
    await service.dispatchPending();
    expect(broker.emit).toHaveBeenCalledTimes(2);
    await expect(service.getJobStatus(job.jobId, 'another-tenant', userId)).rejects.toThrow(
      'not found',
    );
    await expect(service.getJobStatus(job.jobId, tenantId, 'another-user')).rejects.toThrow(
      'not found',
    );
    await prisma.exportTask.update({ where: { id: job.jobId }, data: { expiresAt: new Date(0) } });
    await expect(service.getJobStatus(job.jobId, tenantId, userId)).rejects.toThrow('expired');
  });

  it('serializes workspace quota even for concurrent requests', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () =>
        service.createJob('2026-10-01', '2026-10-11', tenantId, userId),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
    expect(await prisma.exportTask.count()).toBe(10);
  });

  it('claims duplicate broker deliveries once and uses database ownership', async () => {
    const job = await service.createJob('2026-10-01', '2026-10-11', tenantId, userId);
    const compression = {
      compressLogs: jest.fn(async () => ({ zipName: `export-${job.jobId}.zip`, size: 1 })),
    };
    const worker = new WorkerController(compression as any, prisma);
    const channel = { ack: jest.fn(), nack: jest.fn() };
    const ctx = { getChannelRef: () => channel, getMessage: () => ({}) } as any;
    const forged = { ...job, tenantId: 'forged', userId: 'forged' } as any;
    await Promise.all([worker.handleLogExport(forged, ctx), worker.handleLogExport(forged, ctx)]);
    expect(compression.compressLogs).toHaveBeenCalledTimes(1);
    expect(compression.compressLogs).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId, userId }),
    );
    expect(channel.ack).toHaveBeenCalledTimes(2);
    expect(channel.nack).not.toHaveBeenCalled();
    expect(await service.getJobStatus(job.jobId, tenantId, userId)).toMatchObject({
      status: 'Completed',
    });
  });

  it.each(['success', 'failure'])(
    'fences stale %s after a replacement worker completes',
    async (outcome) => {
      const job = await service.createJob('2026-10-01', '2026-10-11', tenantId, userId);
      let finish: (value: { zipName: string; size: number }) => void;
      let fail: (error: Error) => void;
      let started: () => void;
      const ready = new Promise<void>((resolve) => {
        started = resolve;
      });
      const pending = new Promise<{ zipName: string; size: number }>((resolve, reject) => {
        finish = resolve;
        fail = reject;
      });
      const oldCompression = {
        compressLogs: jest.fn(() => {
          started();
          return pending;
        }),
        removeArchive: jest.fn(async () => undefined),
      };
      const channel = { ack: jest.fn(), nack: jest.fn() };
      const ctx = { getChannelRef: () => channel, getMessage: () => ({}) } as any;
      const oldWorker = new WorkerController(oldCompression as any, prisma);
      const running = oldWorker.handleLogExport(job as any, ctx);
      await ready;
      // Only the disposable fixture is expired; no wall-clock sleeps or real worker changes.
      await prisma.exportTask.update({
        where: { id: job.jobId },
        data: { leaseUntil: new Date(0) },
      });
      await service.dispatchPending();
      const replacement = new WorkerController(
        {
          compressLogs: jest.fn(async () => ({ zipName: 'replacement.zip', size: 1 })),
        } as any,
        prisma,
      );
      await replacement.handleLogExport(job as any, ctx);
      if (outcome === 'success') finish({ zipName: 'stale.zip', size: 1 });
      else fail(new Error('Old worker storage failed'));
      await running;
      expect(await service.getJobStatus(job.jobId, tenantId, userId)).toMatchObject({
        status: 'Completed',
        filename: 'replacement.zip',
      });
      expect(oldCompression.removeArchive.mock.calls).toEqual(
        outcome === 'success' ? [['stale.zip']] : [],
      );
      expect(channel.nack).not.toHaveBeenCalled();
    },
  );

  it('does not roll back committed data or run rollback cleanup when a commit hook fails', async () => {
    const rollback = jest.fn();
    const otherCommit = jest.fn(async () => undefined);
    await expect(
      prisma.inTransaction(async () => {
        await prisma.client.tenant.update({ where: { id: tenantId }, data: { name: 'Durable' } });
        prisma.afterRollback(rollback);
        await prisma.afterCommit(async () => {
          throw new Error('Redis offline');
        });
        await prisma.afterCommit(otherCommit);
      }),
    ).rejects.toThrow('Redis offline');
    expect(await prisma.tenant.findUnique({ where: { id: tenantId } })).toMatchObject({
      name: 'Durable',
    });
    expect(rollback).not.toHaveBeenCalled();
    expect(otherCommit).toHaveBeenCalledTimes(1);
  });
});
