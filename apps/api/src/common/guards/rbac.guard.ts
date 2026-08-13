import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../modules/redis/redis.service';
import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RolePermissions } from '../constants/role-permissions.constant';

@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenant = request.tenant;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!tenant) {
      throw new ForbiddenException('Tenant context is required for authorization');
    }

    const cacheKey = `rbac:${tenant.id}:${user.userId}`;
    let userRole: Role | undefined;

    try {
      const cachedRole = await this.redisService.get(cacheKey);
      if (cachedRole) {
        userRole = cachedRole as Role;
        console.log(`[RBAC] Cache Hit: ${cacheKey}`);
        this.logger.debug(`RBAC Cache Hit: ${cacheKey}`);
      } else {
        console.log(`[RBAC] Cache Miss: ${cacheKey}`);
        this.logger.debug(`RBAC Cache Miss: ${cacheKey}`);
      }
    } catch (error: any) {
      this.logger.warn(`Redis get error: ${error.message}`);
    }

    if (!userRole) {
      // Get user role for this tenant
      const tenantUser = await this.prisma.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId: tenant.id,
            userId: user.userId,
          },
        },
      });

      if (!tenantUser) {
        throw new ForbiddenException('User is not a member of this tenant');
      }

      userRole = tenantUser.role as Role;

      try {
        // Cache role for 5 minutes (300 seconds)
        await this.redisService.set(cacheKey, userRole, { EX: 300 });
      } catch (error: any) {
        this.logger.warn(`Redis set error: ${error.message}`);
      }
    }

    // Check Roles
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(userRole);
      if (!hasRole) {
        throw new ForbiddenException(
          `User role '${userRole}' is not authorized. Required roles: ${requiredRoles.join(', ')}`,
        );
      }
    }

    // Check Permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = RolePermissions[userRole] || [];
      const hasAllPermissions = requiredPermissions.every((perm) => userPermissions.includes(perm));
      if (!hasAllPermissions) {
        throw new ForbiddenException(`User lacks required permissions.`);
      }
    }

    return true;
  }
}
