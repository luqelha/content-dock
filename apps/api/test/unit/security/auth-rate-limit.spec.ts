import { INestApplication } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { RateLimitGuard } from '../../../src/common/guards/rate-limit.guard';
import { AuthController } from '../../../src/modules/auth/controllers/auth.controller';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { RedisService } from '../../../src/modules/redis/redis.service';

describe('Authentication rate limit security regression', () => {
  let app: INestApplication;
  const evalScript = jest.fn();
  const auth = { login: jest.fn(), register: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: RedisService, useValue: { getClient: () => ({ eval: evalScript }) } },
        { provide: APP_GUARD, useClass: RateLimitGuard },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    evalScript.mockReset().mockResolvedValue(31);
    auth.login.mockResolvedValue({ access_token: 'test-token' });
    auth.register.mockResolvedValue({ message: 'User registered successfully' });
  });

  afterAll(async () => app?.close());

  it.each([
    '/api/auth/login',
    '/api/auth/login/',
    '/api/AUTH/LOGIN',
    '/API/Auth/Login/?probe=1',
    '/api/auth/login?probe=1',
    '/api/auth/register',
    '/api/auth/register/',
    '/api/AUTH/REGISTER',
    '/api/auth/register/?probe=1',
  ])('blocks equivalent matched route %s before invoking authentication', async (url) => {
    const response = await request(app.getHttpServer()).post(url).send({ email: 'a@example.com' });
    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('60');
    expect(evalScript).toHaveBeenCalledTimes(1);
    expect(auth.login).not.toHaveBeenCalled();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('allows the 30th request and blocks the 31st across login/register aliases', async () => {
    evalScript.mockResolvedValueOnce(30).mockResolvedValueOnce(31);
    await request(app.getHttpServer()).post('/api/auth/login/').send({}).expect(200);
    await request(app.getHttpServer()).post('/api/AUTH/REGISTER').send({}).expect(429);
    expect(evalScript.mock.calls[0][1].keys).toEqual(evalScript.mock.calls[1][1].keys);
    expect(auth.login).toHaveBeenCalledTimes(1);
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('preserves successful registration below the threshold', async () => {
    evalScript.mockResolvedValue(1);
    await request(app.getHttpServer()).post('/api/auth/register/').send({}).expect(201);
    expect(auth.register).toHaveBeenCalledTimes(1);
  });

  it('does not accept spoofed forwarded addresses as a new bucket without a trusted proxy', async () => {
    await request(app.getHttpServer()).post('/api/auth/login').set('X-Forwarded-For', '192.0.2.1');
    await request(app.getHttpServer()).post('/api/auth/login').set('X-Forwarded-For', '192.0.2.2');
    expect(evalScript.mock.calls[0][1].keys).toEqual(evalScript.mock.calls[1][1].keys);
  });

  it('fails closed when Redis is unavailable', async () => {
    evalScript.mockRejectedValue(new Error('Redis unavailable'));
    await request(app.getHttpServer()).post('/api/auth/login').send({}).expect(500);
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('does not throttle unrelated routes', async () => {
    await request(app.getHttpServer()).get('/api/auth/me');
    expect(evalScript).not.toHaveBeenCalled();
  });

  it('does not apply HTTP limiting to worker messages', async () => {
    const guard = new RateLimitGuard({ getClient: jest.fn() } as any, new Reflector());
    expect(await guard.canActivate({ getType: () => 'rpc' } as any)).toBe(true);
  });
});
