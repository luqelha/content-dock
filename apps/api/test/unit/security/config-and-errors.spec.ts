import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { envValidationSchema } from '../../../src/config/env.validation';
import { PrismaClientExceptionFilter } from '../../../src/common/filters/prisma-client-exception.filter';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';
import { createApplicationValidationPipe } from '../../../src/common/pipes/application-validation.pipe';
import { RegisterDto } from '../../../src/modules/auth/dto/register.dto';
import { UpdateUserDto } from '../../../src/modules/user/dto/update-user.dto';
import { JwtStrategy } from '../../../src/modules/auth/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '../../../src/modules/auth/strategies/jwt-refresh.strategy';

const accessSecret = 'test-access-secret-with-at-least-32-characters';
const refreshSecret = 'test-refresh-secret-with-at-least-32-characters';
const environment = {
  DATABASE_URL: 'postgresql://test:test@localhost/atlas_test',
  REDIS_URL: 'redis://localhost',
  RABBITMQ_URL: 'amqp://localhost',
  JWT_SECRET: accessSecret,
  JWT_REFRESH_SECRET: refreshSecret,
};

describe('Config, token and error security contracts', () => {
  it('redacts unexpected error stacks and query strings from logs and responses', () => {
    const filter = new HttpExceptionFilter();
    const log = jest.spyOn((filter as any).logger, 'error').mockImplementation(() => {});
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    filter.catch(new Error('secret-query-value'), {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          path: '/api/example',
          url: '/api/example?token=private',
          method: 'POST',
          id: 'test-id',
        }),
      }),
    } as any);
    expect(status).toHaveBeenCalledWith(500);
    expect(JSON.stringify([log.mock.calls, json.mock.calls])).not.toMatch(
      /secret-query-value|private|token=/,
    );
  });
  it.each([
    { JWT_SECRET: 'short' },
    { JWT_REFRESH_SECRET: 'short' },
    { JWT_REFRESH_SECRET: accessSecret },
  ])('rejects unsafe JWT configuration %j', (override) => {
    expect(envValidationSchema.validate({ ...environment, ...override }).error).toBeDefined();
  });

  it('accepts distinct secrets of sufficient length', () => {
    expect(envValidationSchema.validate(environment).error).toBeUndefined();
  });

  it.each(['P2002', 'P2003', 'P2025', 'P2010'])('redacts Prisma %s error details', (code) => {
    const json = jest.fn();
    const response = { status: jest.fn().mockReturnValue({ json }) };
    const filter = new PrismaClientExceptionFilter();
    const log = jest.spyOn((filter as any).logger, 'error').mockImplementation(() => {});
    filter.catch(
      new Prisma.PrismaClientKnownRequestError('secret-password SQL internal-table', {
        code,
        clientVersion: '5.22.0',
        meta: { target: 'secret-password', field_name: 'internal-table' },
      }),
      {
        switchToHttp: () => ({
          getResponse: () => response,
          getRequest: () => ({
            method: 'POST',
            path: '/api/users',
            url: '/api/users?secret=private',
            id: 'request-1',
          }),
        }),
      } as any,
    );
    expect(JSON.stringify(json.mock.calls)).not.toMatch(
      /secret-password|internal-table|private|SQL/,
    );
    expect(JSON.stringify(log.mock.calls)).not.toMatch(
      /secret-password|internal-table|private|SQL/,
    );
    expect(response.status).toHaveBeenCalledWith(
      { P2002: 409, P2003: 400, P2025: 404, P2010: 500 }[code],
    );
  });

  it('requires fifteen characters for new registrations', async () => {
    const pipe = createApplicationValidationPipe();
    await expect(
      pipe.transform(
        { email: 'user@example.com', password: '12345678901234' },
        { type: 'body', metatype: RegisterDto },
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { email: 'user@example.com', password: 'a long passphrase' },
        { type: 'body', metatype: RegisterDto },
      ),
    ).resolves.toBeDefined();
  });

  it.each(['email', 'password'])(
    'rejects explicit null for %s while allowing omitted values',
    async (field) => {
      const pipe = createApplicationValidationPipe();
      await expect(
        pipe.transform({ [field]: null }, { type: 'body', metatype: UpdateUserDto }),
      ).rejects.toThrow();
      await expect(
        pipe.transform({}, { type: 'body', metatype: UpdateUserDto }),
      ).resolves.toBeDefined();
    },
  );

  it('authenticates only access tokens with the intended issuer, audience and purpose', async () => {
    const config = new ConfigService(environment);
    const signer = new JwtService({ secret: accessSecret });
    const authenticate = (token: string) =>
      new Promise<boolean>((resolve, reject) => {
        const strategy: any = new JwtStrategy(config);
        strategy.success = () => resolve(true);
        strategy.fail = () => resolve(false);
        strategy.error = (error: any) =>
          error.getStatus?.() === 401 ? resolve(false) : reject(error);
        strategy.authenticate({ headers: { authorization: `Bearer ${token}` } });
      });
    const payload = { sub: 'user-1', email: 'user@example.com', token_use: 'access' };
    const options = { issuer: 'atlas-platform', audience: 'atlas-api' };
    expect(await authenticate(signer.sign(payload, options))).toBe(true);
    expect(await authenticate(signer.sign({ ...payload, token_use: 'refresh' }, options))).toBe(
      false,
    );
    expect(await authenticate(signer.sign(payload, { ...options, audience: 'another-api' }))).toBe(
      false,
    );
    expect(await authenticate(signer.sign(payload, { ...options, issuer: 'another-issuer' }))).toBe(
      false,
    );
    expect(await authenticate(signer.sign(payload, { ...options, secret: refreshSecret }))).toBe(
      false,
    );
    expect(await authenticate(signer.sign(payload, { ...options, expiresIn: -1 }))).toBe(false);
    const refresh = new JwtRefreshStrategy(config);
    await expect(refresh.validate({ get: () => 'Bearer test' } as any, payload)).rejects.toThrow();
    await expect(
      refresh.validate({ get: () => 'Bearer test' } as any, { ...payload, token_use: 'refresh' }),
    ).resolves.toMatchObject({ sub: 'user-1', refreshToken: 'test' });
  });
});
