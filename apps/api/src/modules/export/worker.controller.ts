import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { CompressionService } from './compression.service';
import { JobStatus } from './export.service';
import { ExportJob } from './export-job';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

@Controller('worker')
export class WorkerController {
  private readonly logger = new Logger(WorkerController.name);
  constructor(
    private readonly compressionService: CompressionService,
    private readonly prisma: PrismaService,
  ) {}

  @EventPattern('export_logs')
  async handleLogExport(@Payload() data: ExportJob, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      if (!data || typeof data.jobId !== 'string') {
        channel.ack(message);
        return;
      }
      const now = new Date();
      const leaseToken = randomUUID();
      const claimed = await this.prisma.exportTask.updateMany({
        where: {
          id: data.jobId,
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
        channel.ack(message);
        return;
      }
      const ownership = () => ({
        id: data.jobId,
        status: JobStatus.PROCESSING,
        leaseToken,
        leaseUntil: { gt: new Date() },
        expiresAt: { gt: new Date() },
      });
      const task = await this.prisma.exportTask.findFirst({ where: ownership() });
      if (!task) {
        channel.ack(message);
        return;
      }
      // Broker payload is only a pointer. Read ownership and bounds from the database.
      const job = task.payload as unknown as ExportJob;
      let result: { zipName: string; size: number };
      try {
        if (!(await this.prisma.tenant.findUnique({ where: { id: task.tenantId } })))
          throw new Error('Workspace removed');
        result = await this.compressionService.compressLogs({
          ...job,
          jobId: task.id,
          tenantId: task.tenantId,
          userId: task.userId,
        });
      } catch {
        await this.prisma.exportTask.updateMany({
          where: ownership(),
          data: {
            status: JobStatus.FAILED,
            leaseUntil: null,
            leaseToken: null,
            payload: {
              ...job,
              progress: 0,
              error: 'Export failed. Please create a new export.',
            } as unknown as Prisma.InputJsonValue,
          },
        });
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
            ...job,
            progress: 100,
            filename: result.zipName,
          } as unknown as Prisma.InputJsonValue,
        },
      });
      if (!completed.count) {
        await this.compressionService.removeArchive(result.zipName).catch(() => {
          this.logger.warn({ event: 'EXPORT_STALE_ARCHIVE_CLEANUP_FAILED', jobId: task.id });
        });
      }
      channel.ack(message);
    } catch {
      // The outbox retries after its lease; avoid a hot broker requeue loop during DB outages.
      this.logger.error({ event: 'EXPORT_WORKER_RETRY' });
      channel.nack(message, false, false);
    }
  }
}
