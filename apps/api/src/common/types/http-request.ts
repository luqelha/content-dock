import type { Request } from 'express';
import type { Tenant } from '@prisma/client';
import type { Role } from '../enums/role.enum';

export interface AccessPrincipal {
  userId: string;
  email?: unknown;
}

/** Fields populated by middleware and guards; optional before authentication. */
export interface ApplicationRequest extends Request {
  user?: Partial<AccessPrincipal> & { sub?: string };
  tenant?: Pick<Tenant, 'id'>;
  registrationUserId?: string;
  workspaceRole?: Role;
  authorizedTenantId?: string;
}

/** Use only on handlers protected by JwtAuthGuard. */
export interface AuthenticatedRequest {
  tenant?: Pick<Tenant, 'id'>;
  user: AccessPrincipal;
}

/** Use only after JwtAuthGuard and RbacGuard have succeeded. */
export interface TenantRequest extends AuthenticatedRequest {
  tenant: Pick<Tenant, 'id'>;
}

export interface RefreshRequest {
  user: { sub: string; refreshToken: string };
}
