import { Prisma } from '@prisma/client';
import { deferred } from '../../deferred';
import { of, throwError } from 'rxjs';
import { WorkerController } from '../../../src/modules/export/worker.controller';
import { ExportService } from '../../../src/modules/export/export.service';
import { archiveJobId } from '../../../src/modules/export/export-filename';

// Compression itself is exercised by the real encrypted archive Node regression.
jest.mock('../../../src/modules/export/compression.service', () => ({
  CompressionService: class {},
}));

describe('Export worker recovery boundaries', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  let prisma: any;
  let compression: any;
  let channel: any;
  let worker: WorkerController;
  const message = {};
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
  const ctx = () => ({ getChannelRef: () => channel, getMessage: () => message }) as any;
  beforeEach(() => {
    prisma = {
      exportTask: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(task),
      },
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: 'tenant' }) },
    };
    compression = {
      compressLogs: jest.fn().mockResolvedValue({ zipName: 'attempt.zip', size: 1 }),
      removeArchive: jest.fn().mockResolvedValue(undefined),
    };
    channel = { ack: jest.fn(), nack: jest.fn() };
    worker = new WorkerController(compression, prisma);
  });
  it.each([null, {}, { jobId: 3 }])(
    'acks malformed pointers without querying the database: %p',
    async (data) => {
      await worker.handleLogExport(data as any, ctx());
      expect(prisma.exportTask.updateMany).not.toHaveBeenCalled();
      expect(channel.ack).toHaveBeenCalledWith(message);
    },
  );
  it('acks duplicate, expired or completed jobs without compression', async () => {
    prisma.exportTask.updateMany.mockResolvedValueOnce({ count: 0 });
    await worker.handleLogExport({ jobId: id } as any, ctx());
    expect(compression.compressLogs).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });
  it('does not process when ownership was lost between claim and read', async () => {
    prisma.exportTask.findFirst.mockResolvedValue(null);
    await worker.handleLogExport({ jobId: id } as any, ctx());
    expect(compression.compressLogs).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });
  it('fences completion with the claim token, live lease and expiry', async () => {
    await worker.handleLogExport({ jobId: id, tenantId: 'forged' } as any, ctx());
    const [claim, completion] = prisma.exportTask.updateMany.mock.calls.map(
      ([query]: [Prisma.ExportTaskUpdateManyArgs]) => query,
    );
    expect(claim.data.leaseToken).toMatch(/^[a-f0-9-]{36}$/);
    expect(completion.where).toMatchObject({
      id,
      status: 'Processing',
      leaseToken: claim.data.leaseToken,
      leaseUntil: { gt: expect.any(Date) },
      expiresAt: { gt: expect.any(Date) },
    });
    expect(completion.data).toMatchObject({
      status: 'Completed',
      leaseToken: null,
      leaseUntil: null,
    });
    expect(compression.compressLogs).toHaveBeenCalledWith(task.payload);
  });
  it.each(['removed workspace', 'storage failure'])('fences failure for %s', async (reason) => {
    if (reason === 'removed workspace') prisma.tenant.findUnique.mockResolvedValue(null);
    else compression.compressLogs.mockRejectedValue(new Error('disk unavailable'));
    await worker.handleLogExport({ jobId: id } as any, ctx());
    const [claim, failure] = prisma.exportTask.updateMany.mock.calls.map(
      ([query]: [Prisma.ExportTaskUpdateManyArgs]) => query,
    );
    expect(failure.where.leaseToken).toBe(claim.data.leaseToken);
    expect(failure.data).toMatchObject({ status: 'Failed', leaseToken: null });
    expect(JSON.stringify(failure.data)).not.toContain('disk unavailable');
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });
  it('removes only its own unpublished archive after losing the lease', async () => {
    prisma.exportTask.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    await worker.handleLogExport({ jobId: id } as any, ctx());
    expect(compression.removeArchive).toHaveBeenCalledWith('attempt.zip');
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });
  it('leaves stale cleanup failures for retention without changing the winning task', async () => {
    prisma.exportTask.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    compression.removeArchive.mockRejectedValue(new Error('disk busy'));
    await worker.handleLogExport({ jobId: id } as any, ctx());
    expect(prisma.exportTask.updateMany).toHaveBeenCalledTimes(2);
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });
  it('preserves archive on an ambiguous completion response and lets the outbox recover', async () => {
    prisma.exportTask.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockRejectedValueOnce(new Error('connection lost after commit'));
    await worker.handleLogExport({ jobId: id } as any, ctx());
    expect(prisma.exportTask.updateMany).toHaveBeenCalledTimes(2);
    expect(compression.removeArchive).not.toHaveBeenCalled();
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
  });
  it('nacks a database read outage after claim for later lease recovery', async () => {
    prisma.exportTask.findFirst.mockRejectedValue(new Error('DB offline'));
    await worker.handleLogExport({ jobId: id } as any, ctx());
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
  });
  it('accepts historical and attempt archive names but rejects traversal and foreign paths', () => {
    expect(archiveJobId(`export-${id}.zip`)).toBe(id);
    expect(archiveJobId(`export-${id}-${id}.zip`)).toBe(id);
    for (const name of [`../export-${id}.zip`, `export-${id}.zip.enc`, 'export-invalid.zip'])
      expect(archiveJobId(name)).toBeUndefined();
  });
});

describe('Outbox outage and dispatch recovery', () => {
  it('retries broker failure, prevents overlapping dispatch and clears its guard', async () => {
    const deferredTasks = deferred<Array<{ id: string; payload: { jobId: string } }>>();
    const pending = deferredTasks.promise;
    const release = deferredTasks.resolve;
    const task = { id: 'job', payload: { jobId: 'job' } };
    const prisma = {
      exportTask: {
        findMany: jest.fn().mockReturnValueOnce(pending).mockResolvedValue([task]),
        update: jest.fn().mockResolvedValue(task),
      },
    };
    const broker = {
      emit: jest
        .fn()
        .mockReturnValueOnce(throwError(() => new Error('broker offline')))
        .mockReturnValue(of(undefined)),
    };
    const service = new ExportService(broker as any, prisma as any);
    const first = service.dispatchPending();
    await service.dispatchPending();
    expect(prisma.exportTask.findMany).toHaveBeenCalledTimes(1);
    release([task]);
    await first;
    expect(prisma.exportTask.update).not.toHaveBeenCalled();
    await service.dispatchPending();
    expect(prisma.exportTask.update).toHaveBeenCalledTimes(1);
    expect(broker.emit).toHaveBeenCalledTimes(2);
  });
  it('rejects foreign or expired job lookups with no metadata disclosure', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new ExportService({} as any, { exportTask: { findFirst } } as any);
    await expect(service.getJobStatus('job', 'tenant', 'user')).rejects.toThrow('not found');
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'job', tenantId: 'tenant', userId: 'user', expiresAt: { gt: expect.any(Date) } },
    });
  });
});
