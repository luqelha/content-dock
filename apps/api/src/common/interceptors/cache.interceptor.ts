import type { ApplicationRequest } from '../types/http-request';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Optional,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { RedisService } from '../../modules/redis/redis.service';
import { TelemetryService } from '../../modules/observability/telemetry.service';
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  constructor(
    private readonly redisService: RedisService,
    @Optional() private readonly telemetry?: TelemetryService,
  ) {}
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<ApplicationRequest>();
    const tenantId = request.tenant?.id;
    if (!tenantId) return next.handle();
    const revisionKey = `cache-revision:${tenantId}`;
    if (request.method !== 'GET') return next.handle();
    let key: string;
    try {
      const revision = (await this.redisService.get(revisionKey)) || '0';
      key = `cache:v2:${tenantId}:${revision}:${request.originalUrl}`;
      const cached = await this.redisService.get(key);
      if (cached) {
        this.telemetry?.cacheAccess.inc({ outcome: 'hit' });
        return of(JSON.parse(cached));
      }
      this.telemetry?.cacheAccess.inc({ outcome: 'miss' });
    } catch {
      this.telemetry?.cacheAccess.inc({ outcome: 'read_error' });
      return next.handle();
    }
    return next.handle().pipe(
      mergeMap(async (response) => {
        try {
          await this.redisService.set(key, JSON.stringify(response), { EX: 60 });
        } catch {
          this.telemetry?.cacheAccess.inc({ outcome: 'write_error' });
          this.logger.warn({ event: 'CACHE_WRITE_FAILED' });
        }
        return response;
      }),
    );
  }
}
