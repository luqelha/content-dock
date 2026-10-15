import { RbacGuard } from '../../../src/common/guards/rbac.guard';
import { ROLES_KEY } from '../../../src/common/decorators/roles.decorator';
import { Role } from '../../../src/common/enums/role.enum';
import { Permission } from '../../../src/common/enums/permission.enum';

describe('Authoritative workspace authorization', () => {
  let request: any;
  let membership: jest.Mock;
  let roles: Role[];
  let permissions: Permission[];
  let guard: RbacGuard;
  const context = () =>
    ({
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as any;
  beforeEach(() => {
    request = { user: { userId: 'user' }, tenant: { id: 'tenant', role: Role.ADMIN }, params: {} };
    membership = jest.fn().mockResolvedValue({ role: Role.ADMIN });
    roles = [Role.ADMIN];
    permissions = [];
    guard = new RbacGuard(
      { getAllAndOverride: (key: string) => (key === ROLES_KEY ? roles : permissions) } as any,
      { tenantUser: { findUnique: membership } } as any,
    );
  });
  it.each(['user', 'tenant'])('rejects absent %s context', async (key) => {
    delete request[key];
    await expect(guard.canActivate(context())).rejects.toThrow();
    expect(membership).not.toHaveBeenCalled();
  });
  it('rejects a path workspace different from the authenticated tenant', async () => {
    request.params.tenantId = 'foreign';
    await expect(guard.canActivate(context())).rejects.toThrow('does not match');
  });
  it('rejects revoked membership despite cached admin context', async () => {
    membership.mockResolvedValue(null);
    await expect(guard.canActivate(context())).rejects.toThrow('not a member');
    expect(request.authorizedTenantId).toBeUndefined();
  });
  it('rejects a downgraded role despite cached admin context', async () => {
    membership.mockResolvedValue({ role: Role.VIEWER });
    await expect(guard.canActivate(context())).rejects.toThrow('not authorized');
  });
  it('fails closed when the membership store is unavailable', async () => {
    membership.mockRejectedValue(new Error('DB offline'));
    await expect(guard.canActivate(context())).rejects.toThrow('DB offline');
    expect(request.authorizedTenantId).toBeUndefined();
  });
  it('requires all permissions and rejects unknown database roles', async () => {
    roles = [];
    permissions = ['missing-permission' as Permission];
    membership.mockResolvedValue({ role: 'UNKNOWN' });
    await expect(guard.canActivate(context())).rejects.toThrow('lacks required');
  });
  it('records only the authoritative role and tenant after authorization', async () => {
    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(membership).toHaveBeenCalledWith({
      where: { tenantId_userId: { tenantId: 'tenant', userId: 'user' } },
    });
    expect(request).toMatchObject({ authorizedTenantId: 'tenant', workspaceRole: Role.ADMIN });
  });
});
