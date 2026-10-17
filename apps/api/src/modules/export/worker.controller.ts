import { Controller, Logger, Optional } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { CompressionService } from './compression.service';
import { JobStatus } from './export.service';
import { parseExportJob } from './export-job';
import { isRecord } from '../../common/types/unknown-record';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { TelemetryService, WorkerOutcome } from '../observability/telemetry.service';

@Controller('worker')
export class WorkerController {
  private readonly logger = new Logger(WorkerController.name);
  constructor(
    private readonly compressionService: CompressionService,
    private readonly prisma: PrismaService,
    @Optional() private readonly telemetry?: TelemetryService,
  ) {}

  @EventPattern('export_logs')
  async handleLogExport(@Payload() data: unknown, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    const finish = this.telemetry?.workerStarted();
    let outcome: WorkerOutcome = 'retry';
    try {
      if (this.telemetry?.draining) {
        outcome = 'draining';
        channel.nack(message, false, false);
        return;
      }
      if (!isRecord(data) || typeof data.jobId !== 'string') {
        outcome = 'skipped';
        channel.ack(message);
        return;
      }
      const jobId = data.jobId;
      const now = new Date();
      const leaseToken = randomUUID();
      const claimed = await this.prisma.exportTask.updateMany({
        where: {
          id: jobId,
          expiresAt: { gt: now },
          OR: [
            { status: JobStatus.PENDING },
            { status: JobStatus.PROCESSING, leaseUntil: { lt: now } },
          ],
        },
        data: {
          status: JobStatus.PROCESSING,
          leaseUntil: new Date(Date.now() + 600000),
          leaseToken,
        },
      });
      if (!claimed.count) {
        outcome = 'skipped';
        channel.ack(message);
        return;
      }
      const ownership = () => ({
        id: jobId,
        status: JobStatus.PROCESSING,
        leaseToken,
        leaseUntil: { gt: new Date() },
        expiresAt: { gt: new Date() },
      });
      const task = await this.prisma.exportTask.findFirst({ where: ownership() });
      if (!task) {
        outcome = 'skipped';
        channel.ack(message);
        return;
      }
      // Broker payload is only a pointer. Read ownership and bounds from the database.
      const stored = isRecord(task.payload) ? task.payload : {};
      let result: { zipName: string; size: number };
      try {
        const job = parseExportJob(task.payload);
        if (!(await this.prisma.tenant.findUnique({ where: { id: task.tenantId } })))
          throw new Error('Workspace removed');
        result = await this.compressionService.compressLogs({
          ...job,
          jobId: task.id,
          tenantId: task.tenantId,
          userId: task.userId,
        });
      } catch {
        const failed = await this.prisma.exportTask.updateMany({
          where: ownership(),
          data: {
            status: JobStatus.FAILED,
            leaseUntil: null,
            leaseToken: null,
            payload: {
              ...stored,
              progress: 0,
              error: 'Export failed. Please create a new export.',
            } satisfies Prisma.InputJsonObject,
          },
        });
        outcome = failed.count ? 'failed' : 'stale';
        this.logger.warn({ event: 'EXPORT_FAILED', jobId: task.id });
        channel.ack(message);
        return;
      }
      // A lost DB response may mean the completion committed. Never mark it failed
      // or delete its archive on an ambiguous DB error; the outbox/collector recover it.
      const completed = await this.prisma.exportTask.updateMany({
        where: ownership(),
        data: {
          status: JobStatus.COMPLETED,
          leaseUntil: null,
          leaseToken: null,
          payload: {
            ...stored,
            progress: 100,
            filename: result.zipName,
          } satisfies Prisma.InputJsonObject,
        },
      });
      if (!completed.count) {
        await this.compressionService.removeArchive(result.zipName).catch(() => {
          this.logger.warn({ event: 'EXPORT_STALE_ARCHIVE_CLEANUP_FAILED', jobId: task.id });
        });
      }
      outcome = completed.count ? 'completed' : 'stale';
      channel.ack(message);
    } catch {
      // The outbox retries after its lease; avoid a hot broker requeue loop during DB outages.
      this.logger.error({ event: 'EXPORT_WORKER_RETRY' });
      channel.nack(message, false, false);
    } finally {
      finish?.(outcome);
    }
  }
}
