import type { ApplicationRequest } from '../types/http-request';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RolePermissions } from '../constants/role-permissions.constant';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
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

    const request = context.switchToHttp().getRequest<ApplicationRequest>();
    const user = request.user;
    const tenant = request.tenant;

    if (!user?.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!tenant) {
      throw new ForbiddenException('Tenant context is required for authorization');
    }

    if (request.params.tenantId && request.params.tenantId !== tenant.id) {
      throw new ForbiddenException('Workspace does not match the request.');
    }

    // Membership is authoritative; never authorize with a stale cached role.
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

    const userRole = tenantUser.role as Role;

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

    request.workspaceRole = userRole;
    request.authorizedTenantId = tenant.id;
    return true;
  }
}
