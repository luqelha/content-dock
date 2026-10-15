import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { RedisService } from '../../modules/redis/redis.service';
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  constructor(private readonly redisService: RedisService) {}
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenant?.id;
    if (!tenantId) return next.handle();
    const revisionKey = `cache-revision:${tenantId}`;
    if (request.method !== 'GET') return next.handle();
    let key: string;
    try {
      const revision = (await this.redisService.get(revisionKey)) || '0';
      key = `cache:v2:${tenantId}:${revision}:${request.originalUrl}`;
      const cached = await this.redisService.get(key);
      if (cached) return of(JSON.parse(cached));
    } catch {
      return next.handle();
    }
    return next.handle().pipe(
      mergeMap(async (response) => {
        try {
          await this.redisService.set(key, JSON.stringify(response), { EX: 60 });
        } catch (error) {
          this.logger.warn(`Cache write failed: ${error.message}`);
        }
        return response;
      }),
    );
  }
}
