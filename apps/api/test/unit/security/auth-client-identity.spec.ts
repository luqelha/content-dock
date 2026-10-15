import { createHmac } from 'node:crypto';
import { authClientIp } from '../../../src/common/guards/auth-client-identity';
import { RateLimitGuard } from '../../../src/common/guards/rate-limit.guard';

describe('Trusted web authentication identity', () => {
  const secret = 'test-proxy-secret-with-at-least-32-characters';
  function request(ip: string, email = 'user@example.com', time = Date.now()) {
    const timestamp = String(time);
    return {
      ip: '172.20.0.5',
      body: { email },
      headers: {
        'x-atlas-client-ip': ip,
        'x-atlas-auth-time': timestamp,
        'x-atlas-auth-signature': createHmac('sha256', secret)
          .update(`${timestamp}\n${ip}\n${email.trim().toLowerCase()}`)
          .digest('hex'),
      },
    };
  }
  it('separates verified browser addresses behind the same web server', () => {
    expect(authClientIp(request('192.0.2.1'), secret)).toBe('192.0.2.1');
    expect(authClientIp(request('192.0.2.2'), secret)).toBe('192.0.2.2');
  });
  it('ignores forged, expired and account-rebound identity headers', () => {
    const forged = request('192.0.2.1');
    forged.headers['x-atlas-auth-signature'] = '0'.repeat(64);
    const rebound = request('192.0.2.1');
    rebound.body.email = 'another@example.com';
    for (const req of [
      forged,
      rebound,
      request('192.0.2.1', 'user@example.com', Date.now() - 60000),
    ]) {
      expect(authClientIp(req, secret)).toBe('172.20.0.5');
    }
  });
  it('shares an account bucket across different client IPs without storing the email', async () => {
    const evaluate = jest.fn().mockResolvedValue(1);
    const guard = new RateLimitGuard(
      { getClient: () => ({ eval: evaluate }) } as any,
      { get: () => true } as any,
    );
    for (const ip of ['192.0.2.1', '192.0.2.2']) {
      const req = { ip, body: { email: 'USER@example.com' }, headers: {} };
      await guard.canActivate({
        getType: () => 'http',
        getHandler: () => ({}),
        switchToHttp: () => ({ getRequest: () => req }),
      } as any);
    }
    const first = evaluate.mock.calls[0][1].keys;
    const second = evaluate.mock.calls[1][1].keys;
    expect(first[0]).not.toEqual(second[0]);
    expect(first[1]).toEqual(second[1]);
    expect(JSON.stringify(first)).not.toContain('example.com');
  });
});
