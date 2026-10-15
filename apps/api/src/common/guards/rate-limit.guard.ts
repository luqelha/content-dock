import { CanActivate, ExecutionContext, HttpException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { Reflector } from '@nestjs/core';
import { AUTH_RATE_LIMIT } from '../decorators/auth-rate-limit.decorator';
import { RedisService } from '../../modules/redis/redis.service';
import { authClientIp } from './auth-client-identity';
@Injectable()
export class RateLimitGuard implements CanActivate {
  private logger = new Logger(RateLimitGuard.name);
  constructor(
    private redis: RedisService,
    private reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true;
    if (!this.reflector.get<boolean>(AUTH_RATE_LIMIT, context.getHandler())) return true;
    const request = context.switchToHttp().getRequest();
    const key = 'auth-rate:' + createHash('sha256').update(authClientIp(request)).digest('hex');
    const keys = [key];
    if (typeof request.body?.email === 'string' && request.body.email.length <= 320) {
      keys.push(
        'auth-account:' +
          createHash('sha256').update(request.body.email.trim().toLowerCase()).digest('hex'),
      );
    }
    const count = await this.redis
      .getClient()
      .eval(
        "local highest=0; for _,key in ipairs(KEYS) do local n=redis.call('INCR',key); if n==1 then redis.call('EXPIRE',key,60) end; if n>highest then highest=n end end; return highest",
        { keys },
      );
    if (Number(count) > 30) {
      context.switchToHttp().getResponse().setHeader('Retry-After', '60');
      this.logger.warn(
        { event: 'AUTH_RATE_LIMIT', ip: request.ip },
        'Authentication request threshold exceeded',
      );
      throw new HttpException('Too many authentication attempts. Retry in one minute.', 429);
    }
    return true;
  }
}
