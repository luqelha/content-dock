import { deferred } from '../../deferred';
import { mkdtemp, mkdir, writeFile, utimes, readdir, rm, rename, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageRetentionService } from '../../../src/modules/storage/storage-retention.service';
import { WorkerController } from '../../../src/modules/export/worker.controller';

describe('Retention safety', () => {
  let root: string;
  const now = Date.now();
  const old = new Date(now - 72 * 3600000);
  const expired = '11111111-1111-4111-8111-111111111111';
  const leased = '22222222-2222-4222-8222-222222222222';
  const prisma = {
    media: {
      findFirst: jest.fn(async ({ where }) =>
        where.url === '/uploads/live.png' ? { id: 'live' } : null,
      ),
    },
    user: {
      findFirst: jest.fn(async ({ where }) =>
        where.avatarUrl === '/uploads/avatar-live.png' ? { id: 'user' } : null,
      ),
    },
    exportTask: {
      findUnique: jest.fn(async ({ where }) => ({
        expiresAt: old,
        leaseUntil: where.id === leased ? new Date(now + 60000) : null,
      })),
    },
  };
  let service: StorageRetentionService;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'atlas-retention-test-'));
    await mkdir(join(root, 'uploads'));
    await mkdir(join(root, 'exports'));
    for (const name of [
      'orphan.png.enc',
      'live.png.enc',
      'avatar-live.png.enc',
      'recent.png.enc',
      'legacy.png',
    ]) {
      const file = join(root, 'uploads', name);
      await writeFile(file, 'fixture');
      if (name !== 'recent.png.enc') await utimes(file, old, old);
    }
    for (const id of [expired, leased]) {
      const file = join(root, 'exports', `export-${id}.zip.enc`);
      await writeFile(file, 'fixture');
      await utimes(file, old, old);
    }
    service = new StorageRetentionService(prisma as any);
    Object.assign(service, { root });
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });
  it('defaults to dry-run and preserves referenced, recent, leased and legacy files', async () => {
    const candidates = await service.collect(undefined, now);
    expect(candidates.sort()).toEqual([
      `exports/export-${expired}.zip.enc`,
      'uploads/orphan.png.enc',
    ]);
    expect(await readdir(join(root, 'uploads'))).toHaveLength(5);
    expect(await readdir(join(root, 'exports'))).toHaveLength(2);
  });
  it('only deletes confirmed old encrypted orphans when explicitly enabled', async () => {
    await service.collect(false, now);
    expect((await readdir(join(root, 'uploads'))).sort()).toEqual([
      'avatar-live.png.enc',
      'legacy.png',
      'live.png.enc',
      'recent.png.enc',
    ]);
    expect(await readdir(join(root, 'exports'))).toEqual([`export-${leased}.zip.enc`]);
  });
  it('fails closed on database errors without deleting the candidate', async () => {
    prisma.media.findFirst.mockRejectedValueOnce(new Error('DB offline'));
    await expect(service.collect(false, now)).rejects.toThrow('DB offline');
    expect(await readdir(join(root, 'uploads'))).toContain('orphan.png.enc');
  });

  it('recognizes old attempt archives but protects all attempts of a live lease', async () => {
    for (const id of [expired, leased]) {
      const file = join(root, 'exports', `export-${id}-${expired}.zip.enc`);
      await writeFile(file, 'attempt');
      await utimes(file, old, old);
    }
    const candidates = await service.collect(undefined, now);
    expect(candidates).toContain(`exports/export-${expired}-${expired}.zip.enc`);
    expect(candidates).not.toContain(`exports/export-${leased}-${expired}.zip.enc`);
  });

  it('resumes collection after a database failure', async () => {
    prisma.media.findFirst.mockRejectedValueOnce(new Error('offline'));
    await expect(service.collect(true, now)).rejects.toThrow('offline');
    expect(await service.collect(true, now)).toContain('uploads/orphan.png.enc');
  });

  it('does not follow a linked storage directory', async () => {
    await rename(join(root, 'uploads'), join(root, 'external'));
    await symlink(join(root, 'external'), join(root, 'uploads'), 'junction');
    const candidates = await service.collect(true, now);
    expect(candidates.every((candidate) => candidate.startsWith('exports/'))).toBe(true);
    expect(await readdir(join(root, 'external'))).toHaveLength(5);
  });

  it('skips overlapping collectors while an inventory is waiting for the database', async () => {
    const completion = deferred<null>();
    const release = completion.resolve;
    const pending = completion.promise;
    prisma.media.findFirst.mockReturnValueOnce(pending);
    const first = service.collect(true, now);
    expect(await service.collect(true, now)).toEqual([]);
    release(null);
    await first;
  });

  it('does not start a timer by default; enabling the schedule still defaults to dry-run', async () => {
    const enabled = process.env.STORAGE_RETENTION_ENABLED;
    const dryRun = process.env.STORAGE_RETENTION_DRY_RUN;
    jest.useFakeTimers();
    const collect = jest.spyOn(service, 'collect').mockResolvedValue([]);
    try {
      delete process.env.STORAGE_RETENTION_ENABLED;
      delete process.env.STORAGE_RETENTION_DRY_RUN;
      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(3600000);
      expect(collect).not.toHaveBeenCalled();
      process.env.STORAGE_RETENTION_ENABLED = 'true';
      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(3600000);
      expect(collect).toHaveBeenLastCalledWith(true);
      process.env.STORAGE_RETENTION_DRY_RUN = 'false';
      await jest.advanceTimersByTimeAsync(3600000);
      expect(collect).toHaveBeenLastCalledWith(false);
      service.onModuleDestroy();
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      service.onModuleDestroy();
      jest.useRealTimers();
      if (enabled === undefined) delete process.env.STORAGE_RETENTION_ENABLED;
      else process.env.STORAGE_RETENTION_ENABLED = enabled;
      if (dryRun === undefined) delete process.env.STORAGE_RETENTION_DRY_RUN;
      else process.env.STORAGE_RETENTION_DRY_RUN = dryRun;
    }
  });
});

describe('Worker outages', () => {
  it('does not leave messages unacknowledged when the database is unavailable', async () => {
    const worker = new WorkerController(
      {} as any,
      { exportTask: { updateMany: jest.fn().mockRejectedValue(new Error('DB offline')) } } as any,
    );
    const channel = { ack: jest.fn(), nack: jest.fn() };
    const message = {};
    await worker.handleLogExport(
      { jobId: 'job' } as any,
      { getChannelRef: () => channel, getMessage: () => message } as any,
    );
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
  });
});
