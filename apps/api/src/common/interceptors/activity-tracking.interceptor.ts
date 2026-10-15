import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, defer, lastValueFrom } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../../modules/audit/audit.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../modules/redis/redis.service';
import { TRACK_ACTIVITY_KEY, TrackActivityOptions } from '../decorators/track-activity.decorator';

@Injectable()
export class ActivityTrackingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityTrackingInterceptor.name);
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest();
    let options = this.reflector.get<TrackActivityOptions>(
      TRACK_ACTIVITY_KEY,
      context.getHandler(),
    );
    const segments = (request.route?.path || '').split('/').filter(Boolean);
    const resource = segments[0] === 'api' ? segments[1] : segments[0];
    if (!options && request.user && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
      const action = { POST: 'CREATE', PATCH: 'UPDATE', PUT: 'UPDATE', DELETE: 'DELETE' }[
        request.method
      ];
      options = {
        action: `${action}_${(resource || 'workspace').toUpperCase()}`,
        entity: resource,
      };
    }
    if (!options) return next.handle();
    const tracked = options;
    return defer(async () => {
      let changedTenant: string | undefined;
      let actorId: string | undefined;
      let result: any;
      try {
        // Audit rows and business mutations commit or roll back together.
        result = await this.prisma.inTransaction(async () => {
          const data = await lastValueFrom(next.handle());
          const authEvent = ['LOGIN', 'REGISTER'].includes(tracked.action);
          actorId = authEvent
            ? data?.user?.id || request.registrationUserId
            : request.user?.userId || request.user?.sub;
          // A supplied tenant header is not evidence of authorization.
          changedTenant = authEvent ? undefined : request.authorizedTenantId;
          if (
            !changedTenant &&
            resource === 'tenants' &&
            request.method === 'POST' &&
            !request.params?.tenantId
          ) {
            changedTenant = data?.id;
          }
          if (!changedTenant && segments.includes('invitations') && segments.includes('accept'))
            changedTenant = data?.tenantId;
          await this.auditService.logActivity({
            tenantId: changedTenant,
            userId: actorId,
            action: tracked.action,
            entity: tracked.entity,
            entityId:
              request.params?.userId ||
              request.params?.id ||
              request.params?.tenantId ||
              data?.id ||
              data?.data?.jobId ||
              (authEvent ? actorId : undefined),
            details: {
              fields: Object.keys(request.body || {}).filter(
                (key) => !/password|token|secret|body/i.test(key),
              ),
            },
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          });
          return data;
        });
      } catch (error) {
        if (
          ['LOGIN', 'REGISTER'].includes(tracked.action) &&
          [400, 401, 409].includes(error.getStatus?.())
        ) {
          await this.auditService.logActivity({
            action: `${tracked.action}_FAILED`,
            entity: 'User',
            ipAddress: request.ip,
          });
        }
        throw error;
      }
      // Invalidate relation-dependent content only after the DB commit.
      try {
        const tenants = new Set<string>(changedTenant ? [changedTenant] : []);
        if (resource === 'users' && actorId) {
          const memberships = await this.prisma.client.tenantUser.findMany({
            where: { userId: actorId },
            select: { tenantId: true },
          });
          memberships.forEach((member) => tenants.add(member.tenantId));
        }
        for (const tenantId of tenants)
          await this.redis.getClient().incr(`cache-revision:${tenantId}`);
      } catch {
        this.logger.warn({ event: 'CACHE_INVALIDATION_FAILED' });
      }
      return result;
    });
  }
}
