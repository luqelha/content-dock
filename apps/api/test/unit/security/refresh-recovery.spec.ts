import { AuthService } from '../../../src/modules/auth/services/auth.service';
import * as bcrypt from 'bcrypt';
jest.mock('bcrypt');

describe('Refresh rotation and failure recovery', () => {
  let users: any;
  let redis: any;
  let client: any;
  let prisma: any;
  let service: AuthService;
  const tokens = { access_token: 'new-access', refresh_token: 'new-refresh' };
  beforeEach(() => {
    users = {
      findByIdForAuth: jest
        .fn()
        .mockResolvedValue({ id: 'user', email: 'test@example.test', refreshToken: 'stored-hash' }),
      rotateRefreshToken: jest.fn().mockResolvedValue(true),
    };
    client = { set: jest.fn().mockResolvedValue('OK'), eval: jest.fn().mockResolvedValue(1) };
    redis = {
      getClient: () => client,
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    prisma = { afterCommit: jest.fn(async (work) => work()), afterRollback: jest.fn() };
    service = new AuthService(users, {} as any, {} as any, redis, prisma);
    jest.spyOn(service, 'getTokens').mockResolvedValue(tokens);
    (bcrypt.compare as jest.Mock).mockReset().mockResolvedValue(true);
  });
  it('rotates once and releases its own Redis lock after commit', async () => {
    await expect(service.refreshTokens('user', 'old-token')).resolves.toEqual(tokens);
    expect(users.rotateRefreshToken).toHaveBeenCalledWith('user', 'stored-hash', 'new-refresh');
    expect(prisma.afterCommit).toHaveBeenCalledTimes(1);
    expect(client.eval).toHaveBeenCalledWith(expect.stringContaining("redis.call('GET'"), {
      keys: ['refresh-lock:user'],
      arguments: [client.set.mock.calls[0][1]],
    });
  });
  it.each([null, { id: 'user', refreshToken: null }])(
    'denies missing/revoked session %p and releases the lock',
    async (user) => {
      users.findByIdForAuth.mockResolvedValue(user);
      await expect(service.refreshTokens('user', 'old-token')).rejects.toThrow('Access Denied');
      expect(users.rotateRefreshToken).not.toHaveBeenCalled();
      expect(client.eval).toHaveBeenCalled();
    },
  );
  it('denies a mismatched refresh digest', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(service.refreshTokens('user', 'old-token')).rejects.toThrow('Access Denied');
    expect(users.rotateRefreshToken).not.toHaveBeenCalled();
  });
  it('does not publish tokens when another login wins the database rotation', async () => {
    users.rotateRefreshToken.mockResolvedValue(false);
    await expect(service.refreshTokens('user', 'old-token')).rejects.toThrow('Session changed');
    expect(redis.set).not.toHaveBeenCalled();
  });
  it('does not reuse a cached rotation after logout', async () => {
    redis.get.mockResolvedValue(JSON.stringify(tokens));
    users.findByIdForAuth.mockResolvedValue({ refreshToken: null });
    await expect(service.refreshTokens('user', 'old-token')).rejects.toThrow('Access Denied');
    expect(client.set).not.toHaveBeenCalled();
  });
  it('reuses concurrent results only while the new token still matches the database', async () => {
    redis.get.mockResolvedValue(JSON.stringify(tokens));
    await expect(service.refreshTokens('user', 'old-token')).resolves.toEqual(tokens);
    expect(users.rotateRefreshToken).not.toHaveBeenCalled();
  });
  it('releases the lock even when Redis publication fails after rotation', async () => {
    redis.set.mockRejectedValue(new Error('Redis offline'));
    await expect(service.refreshTokens('user', 'old-token')).rejects.toThrow('Redis offline');
    expect(users.rotateRefreshToken).toHaveBeenCalledTimes(1);
    expect(client.eval).toHaveBeenCalled();
  });
  it('fails closed before rotation if Redis is unavailable', async () => {
    redis.get.mockRejectedValue(new Error('Redis offline'));
    await expect(service.refreshTokens('user', 'old-token')).rejects.toThrow('Redis offline');
    expect(users.rotateRefreshToken).not.toHaveBeenCalled();
  });
});
