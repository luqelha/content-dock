import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Optional } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import { TelemetryService } from '../modules/observability/telemetry.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly transactions = new AsyncLocalStorage<{
    client: Prisma.TransactionClient;
    commit: Array<() => Promise<unknown>>;
    rollback: Array<() => Promise<unknown>>;
  }>();
  private readonly logger = new Logger(PrismaService.name);
  private readonly rootClient: Prisma.TransactionClient;

  constructor(@Optional() telemetry?: TelemetryService) {
    super();
    if (telemetry)
      this.$use(async (params, next) => {
        const model = [
          'Tenant',
          'User',
          'TenantUser',
          'Category',
          'Content',
          'Media',
          'AuditLog',
          'ExportTask',
        ].includes(params.model ?? '')
          ? params.model
          : 'other';
        const operation = [
          'findUnique',
          'findFirst',
          'findMany',
          'count',
          'aggregate',
          'groupBy',
          'create',
          'createMany',
          'update',
          'updateMany',
          'delete',
          'deleteMany',
          'upsert',
          'queryRaw',
          'executeRaw',
        ].includes(params.action)
          ? params.action
          : 'other';
        const start = performance.now();
        telemetry.dbInflight.inc();
        try {
          return await next(params);
        } finally {
          telemetry.dbInflight.dec();
          telemetry.dbDuration.observe({ model, operation }, (performance.now() - start) / 1000);
        }
      });
    // Preserve Prisma's public proxy; getters are invoked with its underlying target.
    this.rootClient = this;
  }

  /** Business queries use the current request transaction, or the normal client. */
  get client(): Prisma.TransactionClient {
    return this.transactions.getStore()?.client || this.rootClient;
  }

  async afterCommit(work: () => Promise<unknown>): Promise<void> {
    const state = this.transactions.getStore();
    if (state) state.commit.push(work);
    else await work();
  }

  afterRollback(work: () => Promise<unknown>): void {
    this.transactions.getStore()?.rollback.push(work);
  }

  async inTransaction<T>(work: (client: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const current = this.transactions.getStore();
    if (current) return work(current.client);
    const state: {
      client: Prisma.TransactionClient;
      commit: Array<() => Promise<unknown>>;
      rollback: Array<() => Promise<unknown>>;
    } = { client: this.rootClient, commit: [], rollback: [] };
    let result: T;
    try {
      result = await this.$transaction(
        (client) => {
          state.client = client;
          return this.transactions.run(state, () => work(client));
        },
        { timeout: 15000, maxWait: 5000 },
      );
    } catch (error) {
      for (const callback of state.rollback.reverse()) {
        try {
          await callback();
        } catch {
          this.logger.error({ event: 'TRANSACTION_ROLLBACK_CLEANUP_FAILED' });
        }
      }
      throw error;
    }
    // A callback failure cannot roll back an already committed database transaction.
    const outcomes = await Promise.allSettled(state.commit.map((callback) => callback()));
    const failure = outcomes.find((outcome) => outcome.status === 'rejected');
    if (failure?.status === 'rejected') {
      this.logger.error({ event: 'TRANSACTION_COMMIT_CALLBACK_FAILED' });
      throw failure.reason;
    }
    return result;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
