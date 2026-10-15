import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly transactions = new AsyncLocalStorage<{
    client: Prisma.TransactionClient;
    commit: Array<() => Promise<unknown>>;
    rollback: Array<() => Promise<unknown>>;
  }>();
  private readonly logger = new Logger(PrismaService.name);
  private readonly rootClient: Prisma.TransactionClient;

  constructor() {
    super();
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
    const state = { client: this.rootClient, commit: [], rollback: [] };
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
