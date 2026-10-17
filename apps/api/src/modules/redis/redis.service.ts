import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      disableOfflineQueue: true,
      socket: {
        connectTimeout: 2500,
        reconnectStrategy: (retries) => Math.min(100 * 2 ** Math.min(retries, 5), 3000),
      },
    });

    this.client.on('error', () => this.logger.error({ event: 'REDIS_CONNECTION_ERROR' }));
    this.client.on('connect', () => this.logger.log('Connected to Redis'));
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.disconnect();
    }
  }

  async get(key: string): Promise<string | null> {
    const value = await this.client.get(key);
    return value as string | null;
  }

  async set(key: string, value: string, options?: any): Promise<void> {
    await this.client.set(key, value, options);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async clearUserRbacCache(userId: string): Promise<void> {
    try {
      // Find all RBAC cache keys for this user across any tenant
      const keys = await this.client.keys(`rbac:*:${userId}`);
      if (keys.length > 0) {
        await this.client.del(keys);
        this.logger.log(`Cleared ${keys.length} RBAC cache entries for user ${userId}`);
      } else {
        this.logger.log(`No RBAC cache found for user ${userId} to clear`);
      }
    } catch (e) {
      this.logger.error(`Failed to clear RBAC cache for user ${userId}`, e);
    }
  }
}
