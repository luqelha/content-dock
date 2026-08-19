import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../../modules/redis/redis.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(private readonly redisService: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];

    // Invalidate cache on mutations
    if (request.method !== 'GET') {
      return next.handle().pipe(
        tap(async () => {
          try {
            // Extract base resource path, e.g., /api/contents/123 -> /api/contents
            const resourcePath = request.originalUrl.split('/').slice(0, 3).join('/');
            const pattern = `cache:${tenantId || 'global'}:${resourcePath}*`;
            const keys = await this.redisService.getClient().keys(pattern);
            if (keys.length > 0) {
              await this.redisService.getClient().del(keys);
              this.logger.debug(`Invalidated ${keys.length} cache keys for pattern ${pattern}`);
            }
          } catch (error) {
            this.logger.warn(`Redis invalidation error: ${error.message}`);
          }
        }),
      );
    }

    // Construct cache key with tenant isolation
    const cacheKey = `cache:${tenantId || 'global'}:${request.originalUrl}`;

    try {
      const cachedResponse = await this.redisService.get(cacheKey);
      if (cachedResponse) {
        this.logger.debug(`Cache hit: ${cacheKey}`);
        return of(JSON.parse(cachedResponse));
      }
    } catch (error) {
      this.logger.warn(`Redis get error: ${error.message}`);
    }

    this.logger.debug(`Cache miss: ${cacheKey}`);
    return next.handle().pipe(
      tap(async (response) => {
        try {
          // Cache for 60 seconds
          await this.redisService.set(cacheKey, JSON.stringify(response), { EX: 60 });
        } catch (error) {
          this.logger.warn(`Redis set error: ${error.message}`);
        }
      }),
    );
  }
}
