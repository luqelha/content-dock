import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { readdir, lstat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../../database/prisma.service';
import { archiveJobId } from '../export/export-filename';
import { TelemetryService } from '../observability/telemetry.service';

/** Opt-in collector. Dry-run is the default, including manual invocations. */
@Injectable()
export class StorageRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly root = join(process.cwd(), 'storage');
  private readonly logger = new Logger(StorageRetentionService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly telemetry?: TelemetryService,
  ) {}
  onModuleInit() {
    if (process.env.STORAGE_RETENTION_ENABLED !== 'true') return;
    this.timer = setInterval(
      () =>
        void this.collect(process.env.STORAGE_RETENTION_DRY_RUN !== 'false').catch(() => {
          this.logger.error({ event: 'STORAGE_RETENTION_FAILED' });
        }),
      3600000,
    );
    this.timer.unref();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async collect(dryRun = true, now = Date.now()) {
    if (this.running) return [];
    this.running = true;
    const candidates: string[] = [];
    try {
      for (const directory of ['uploads', 'exports']) {
        const folder = join(this.root, directory);
        const folderStat = await lstat(folder).catch((error) => {
          if (error.code !== 'ENOENT') throw error;
        });
        if (!folderStat || !folderStat.isDirectory() || folderStat.isSymbolicLink()) continue;
        for (const entry of await readdir(folder, { withFileTypes: true })) {
          if (!entry.isFile() || !/^[a-zA-Z0-9-]+\.[a-zA-Z0-9]+\.enc$/.test(entry.name)) continue;
          const file = join(folder, entry.name);
          const info = await lstat(file);
          // Grace exceeds every upload transaction, export lease and 24-hour job expiry.
          if (info.isSymbolicLink() || info.mtimeMs > now - 48 * 3600000) continue;
          if (directory === 'uploads') {
            const url = '/uploads/' + entry.name.slice(0, -4);
            if (
              (await this.prisma.media.findFirst({ where: { url }, select: { id: true } })) ||
              (await this.prisma.user.findFirst({
                where: { avatarUrl: url },
                select: { id: true },
              }))
            )
              continue;
          } else {
            const jobId = archiveJobId(entry.name.slice(0, -4));
            if (!jobId) continue;
            const task = await this.prisma.exportTask.findUnique({ where: { id: jobId } });
            if (task && (task.expiresAt.getTime() > now || (task.leaseUntil?.getTime() ?? 0) > now))
              continue;
          }
          candidates.push(`${directory}/${entry.name}`);
          if (!dryRun) await unlink(file);
        }
      }
      this.logger.log({ event: 'STORAGE_RETENTION', dryRun, candidates: candidates.length });
      return candidates;
    } catch (error) {
      this.telemetry?.retentionErrors.inc();
      throw error;
    } finally {
      this.running = false;
    }
  }
}
