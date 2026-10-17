import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { UnauthorizedException } from '@nestjs/common';
import { ActivityTrackingInterceptor } from '../../../src/common/interceptors/activity-tracking.interceptor';

describe('Audit attribution and cache invalidation', () => {
  const logActivity = jest.fn();
  const incr = jest.fn();
  const findMany = jest.fn();
  const inTransaction = jest.fn(async (work) => work());
  const reflect = { get: jest.fn() };
  const interceptor = new ActivityTrackingInterceptor(
    reflect as unknown as Reflector,
    { logActivity } as any,
    { inTransaction, client: { tenantUser: { findMany } } } as any,
    { getClient: () => ({ incr }) } as any,
  );
  const context = (request: any) =>
    ({
      getType: () => 'http',
      getHandler: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ headers: {}, params: {}, ...request }) }),
    }) as any;
  beforeEach(() => {
    jest.clearAllMocks();
    logActivity.mockReset().mockResolvedValue(undefined);
    incr.mockResolvedValue(1);
    findMany.mockResolvedValue([]);
  });

  it('ignores an untrusted tenant header on login and records the authenticated actor', async () => {
    reflect.get.mockReturnValue({ action: 'LOGIN', entity: 'User' });
    await lastValueFrom(
      interceptor.intercept(
        context({
          method: 'POST',
          route: { path: '/api/auth/login' },
          tenant: { id: 'spoofed' },
          body: { email: 'a@b.test', password: 'secret' },
        }),
        { handle: () => of({ user: { id: 'real-user' } }) },
      ),
    );
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: undefined,
        userId: 'real-user',
        entityId: 'real-user',
        details: { fields: ['email'] },
      }),
    );
    expect(incr).not.toHaveBeenCalled();
  });
  it('records authorized tenant and membership target, then invalidates related cache', async () => {
    reflect.get.mockReturnValue(undefined);
    await lastValueFrom(
      interceptor.intercept(
        context({
          method: 'PATCH',
          route: { path: '/api/tenants/:tenantId/members/:userId' },
          authorizedTenantId: 'authorized',
          tenant: { id: 'spoofed' },
          user: { userId: 'actor' },
          params: { userId: 'target' },
        }),
        { handle: () => of({ id: 'membership' }) },
      ),
    );
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'authorized', userId: 'actor', entityId: 'target' }),
    );
    expect(incr).toHaveBeenCalledWith('cache-revision:authorized');
  });
  it('records the server-side registration actor while keeping public responses generic', async () => {
    reflect.get.mockReturnValue({ action: 'REGISTER', entity: 'User' });
    const result = await lastValueFrom(
      interceptor.intercept(
        context({
          method: 'POST',
          route: { path: '/api/auth/register' },
          registrationUserId: 'new-user',
          body: { email: 'a@b.test', password: 'secret' },
        }),
        { handle: () => of({ message: 'Registration request received' }) },
      ),
    );
    expect(result).toEqual({ message: 'Registration request received' });
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'new-user',
        entityId: 'new-user',
        details: { fields: ['email'] },
      }),
    );
  });
  it('invalidates author representations across the authenticated users memberships', async () => {
    reflect.get.mockReturnValue(undefined);
    findMany.mockResolvedValue([{ tenantId: 'one' }, { tenantId: 'two' }]);
    await lastValueFrom(
      interceptor.intercept(
        context({ method: 'PATCH', route: { path: '/api/users/:id' }, user: { userId: 'actor' } }),
        { handle: () => of({ id: 'actor' }) },
      ),
    );
    expect(incr.mock.calls).toEqual([['cache-revision:one'], ['cache-revision:two']]);
  });
  it('does not report mutation success or invalidate caches if audit persistence fails', async () => {
    reflect.get.mockReturnValue({ action: 'UPDATE' });
    logActivity.mockRejectedValue(new Error('audit unavailable'));
    await expect(
      lastValueFrom(
        interceptor.intercept(context({ method: 'PATCH', authorizedTenantId: 'one' }), {
          handle: () => of({ id: 'record' }),
        }),
      ),
    ).rejects.toThrow('audit unavailable');
    expect(incr).not.toHaveBeenCalled();
  });
  it('records failed authentication without credentials or supplied tenant context', async () => {
    reflect.get.mockReturnValue({ action: 'LOGIN' });
    await expect(
      lastValueFrom(
        interceptor.intercept(
          context({ method: 'POST', tenant: { id: 'spoofed' }, body: { password: 'secret' } }),
          { handle: () => throwError(() => new UnauthorizedException()) },
        ),
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(logActivity).toHaveBeenCalledWith({
      action: 'LOGIN_FAILED',
      entity: 'User',
      ipAddress: undefined,
    });
  });
});
