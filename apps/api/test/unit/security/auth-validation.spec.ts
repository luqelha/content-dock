import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { createApplicationValidationPipe } from '../../../src/common/pipes/application-validation.pipe';
import { AuthController } from '../../../src/modules/auth/controllers/auth.controller';
import { AuthService, REGISTRATION_MESSAGE } from '../../../src/modules/auth/services/auth.service';
import { RegisterDto } from '../../../src/modules/auth/dto/register.dto';
import { CreateUserDto } from '../../../src/modules/user/dto/create-user.dto';
import { UpdateUserDto } from '../../../src/modules/user/dto/update-user.dto';

describe('Authentication validation and public responses', () => {
  let app: INestApplication;
  const auth = { register: jest.fn(), login: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: auth }],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(createApplicationValidationPipe());
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    auth.register.mockResolvedValue({ message: REGISTRATION_MESSAGE, user: { id: 'internal-id' } });
    auth.login.mockResolvedValue({ access_token: 'access', refresh_token: 'refresh' });
  });
  afterAll(async () => app?.close());

  it.each([
    {},
    { email: ['a@example.com'], password: 'a long passphrase' },
    { email: 'bad-address', password: 'a long passphrase' },
    { email: 'a@example.com', password: 'x'.repeat(14) },
    { email: 'a@example.com', password: 'x'.repeat(73) },
    { email: 'a@example.com', password: '🔒'.repeat(19) },
    { email: 'a@example.com', password: { value: 'a long passphrase' } },
    { email: 'a@example.com', password: null },
  ])('rejects malformed registration before calling authentication: %j', async (body) => {
    await request(app.getHttpServer()).post('/auth/register').send(body).expect(400);
    expect(auth.register).not.toHaveBeenCalled();
  });

  it.each(['x'.repeat(15), 'x'.repeat(72), '🔒'.repeat(18), '  a long passphrase  '])(
    'accepts supported passphrases without altering them',
    async (password) => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: ' New@Example.com ',
          password,
          role: 'ADMIN',
          refreshToken: 'injected',
        })
        .expect(201);
      expect(auth.register).toHaveBeenCalledWith({ email: 'new@example.com', password });
    },
  );

  it('returns identical status and body for existing and new accounts, without caching', async () => {
    const results = [];
    for (const user of [{ id: 'internal-id' }, null]) {
      auth.register.mockResolvedValueOnce({ message: REGISTRATION_MESSAGE, user });
      const result = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'new@example.com',
          password: 'a long passphrase',
        })
        .expect(201);
      expect(result.headers['cache-control']).toBe('no-store');
      expect(result.body).toEqual({ message: REGISTRATION_MESSAGE });
      results.push(result.body);
    }
    expect(results[0]).toEqual(results[1]);
  });

  it('normalizes login email and allows existing eight-character passwords', async () => {
    const result = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: ' Old@Example.com ',
        password: 'old-pass',
      })
      .expect(200);
    expect(auth.login).toHaveBeenCalledWith({ email: 'old@example.com', password: 'old-pass' });
    expect(result.headers['cache-control']).toBe('no-store');
  });

  it.each([RegisterDto, CreateUserDto, UpdateUserDto])(
    'applies the same new-password policy to %p',
    async (metatype) => {
      const pipe = createApplicationValidationPipe();
      for (const password of ['x'.repeat(14), 'x'.repeat(73), '🔒'.repeat(19)]) {
        await expect(
          pipe.transform({ email: 'a@example.com', password }, { type: 'body', metatype }),
        ).rejects.toThrow();
      }
    },
  );
});
