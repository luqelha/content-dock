import {
  Injectable,
  Inject,
  NotFoundException,
  HttpException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { lastValueFrom, timeout } from 'rxjs';
import { ExportJob } from './export-job';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

export enum JobStatus {
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
}

@Injectable()
export class ExportService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExportService.name);
  private timer?: NodeJS.Timeout;
  private dispatching = false;
  constructor(
    @Inject('RABBITMQ_SERVICE') private readonly rabbitClient: ClientProxy,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.dispatchPending(), 30000);
    this.timer.unref();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async createJob(startDate: string, endDate: string, tenantId: string, userId: string) {
    return this.prisma.inTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Tenant" WHERE id = ${tenantId} FOR UPDATE`;
      const count = await tx.exportTask.count({
        where: { tenantId, createdAt: { gte: new Date(Date.now() - 86400000) } },
      });
      if (count >= 10)
        throw new HttpException('Workspace export limit reached. Try again later.', 429);
      const job: ExportJob = {
        jobId: randomUUID(),
        startDate,
        endDate,
        tenantId,
        userId,
        createdAt: new Date().toISOString(),
        status: JobStatus.PENDING,
        progress: 0,
      };
      await tx.exportTask.create({
        data: {
          id: job.jobId,
          tenantId,
          userId,
          payload: job as unknown as Prisma.InputJsonValue,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      await this.prisma.afterCommit(() => this.dispatchPending());
      return { jobId: job.jobId, status: JobStatus.PENDING };
    });
  }

  async dispatchPending() {
    if (this.dispatching) return;
    this.dispatching = true;
    try {
      const now = new Date();
      const tasks = await this.prisma.exportTask.findMany({
        where: {
          expiresAt: { gt: now },
          OR: [
            {
              status: JobStatus.PENDING,
              OR: [{ dispatchedAt: null }, { dispatchedAt: { lt: new Date(Date.now() - 60000) } }],
            },
            { status: JobStatus.PROCESSING, leaseUntil: { lt: now } },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });
      for (const task of tasks) {
        await lastValueFrom(
          this.rabbitClient.emit('export_logs', task.payload).pipe(timeout(5000)),
        );
        await this.prisma.exportTask.update({
          where: { id: task.id },
          data: { dispatchedAt: now },
        });
      }
    } catch {
      this.logger.warn({ event: 'EXPORT_DISPATCH_RETRY' });
    } finally {
      this.dispatching = false;
    }
  }

  async getJobStatus(jobId: string, tenantId: string, userId: string): Promise<ExportJob> {
    const task = await this.prisma.exportTask.findFirst({
      where: {
        id: jobId,
        tenantId,
        userId,
        expiresAt: { gt: new Date() },
      },
    });
    if (!task) throw new NotFoundException('Job not found or has expired.');
    return { ...(task.payload as unknown as ExportJob), status: task.status };
  }
}
