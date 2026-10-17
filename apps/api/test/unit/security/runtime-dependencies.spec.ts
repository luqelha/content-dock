import { INestApplication, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import * as express from 'express';
import * as compression from 'compression';
import * as http from 'http';
import * as zlib from 'zlib';
import { AddressInfo } from 'net';
import { once } from 'events';
import { MediaModule } from '../../../src/modules/media/media.module';
import { MediaService } from '../../../src/modules/media/media.service';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../../src/common/guards/rbac.guard';

jest.mock('zlib', () => {
  const actual = jest.requireActual('zlib');
  return { ...actual, createGzip: jest.fn(actual.createGzip) };
});

describe('Patched compression', () => {
  it('still compresses successful responses', async () => {
    const app = express();
    app.use(compression());
    app.get('/', (_req, res) => res.type('text').send('response'.repeat(1000)));
    const response = await request(app).get('/').set('Accept-Encoding', 'gzip').expect(200);
    expect(response.headers['content-encoding']).toBe('gzip');
    expect(response.text).toBe('response'.repeat(1000));
  });

  it('destroys the native compression stream when a client aborts the response', async () => {
    const gzip = zlib.createGzip as jest.Mock;
    gzip.mockClear();
    const app = express();
    app.use(compression({ threshold: 0 }));
    let responseClosed: Promise<unknown[]> | undefined;
    app.get('/', (_req, res) => {
      responseClosed = once(res, 'close');
      res.type('text').write('partial response'.repeat(1000));
      res.flush();
    });
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      await new Promise<void>((resolve, reject) => {
        const client = http.get(
          {
            hostname: '127.0.0.1',
            port: (server.address() as AddressInfo).port,
            headers: { 'Accept-Encoding': 'gzip' },
          },
          (response) => {
            response.once('data', () => {
              response.destroy();
              resolve();
            });
          },
        );
        client.setTimeout(2000, () => client.destroy(new Error('Response timed out')));
        client.once('error', reject);
      });
      if (!responseClosed) throw new Error('Response did not start');
      await responseClosed;
      expect(gzip).toHaveBeenCalledTimes(1);
      expect(gzip.mock.results[0].value.destroyed).toBe(true);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

describe('Patched Multer through the actual media module', () => {
  let app: INestApplication;
  const createMedia = jest.fn(async (_tenant, file) => ({ size: file.size }));

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [MediaModule] })
      .overrideProvider(MediaService)
      .useValue({ createMedia })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RbacGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest().tenant = { id: 'test-tenant' };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });
  beforeEach(() => createMedia.mockClear());
  afterAll(async () => app?.close());

  it('preserves valid uploads at the configured size limit', async () => {
    const size = 5 * 1024 * 1024;
    const result = await request(app.getHttpServer())
      .post('/media/upload')
      .attach('file', Buffer.alloc(size), { filename: 'test.png', contentType: 'image/png' })
      .expect(201);
    expect(result.body.size).toBe(size);
    expect(createMedia).toHaveBeenCalledTimes(1);
  });

  it('rejects oversized uploads before persistence', async () => {
    await request(app.getHttpServer())
      .post('/media/upload')
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), 'test.png')
      .expect(413);
    expect(createMedia).not.toHaveBeenCalled();
  });

  it('retains the existing MIME restriction', async () => {
    await request(app.getHttpServer())
      .post('/media/upload')
      .attach('file', Buffer.from('plain text'), 'test.txt')
      .expect(400);
    expect(createMedia).not.toHaveBeenCalled();
  });

  it('rejects unexpected file fields before persistence', async () => {
    await request(app.getHttpServer())
      .post('/media/upload')
      .attach('unexpected', Buffer.from('test'), 'test.png')
      .expect(400);
    expect(createMedia).not.toHaveBeenCalled();
  });

  it('rejects oversized multipart text fields without crashing the process', async () => {
    await request(app.getHttpServer())
      .post('/media/upload')
      .field('description', 'x'.repeat(1024 * 1024 + 1))
      .attach('file', Buffer.from('test'), 'test.png')
      .expect(400);
    expect(createMedia).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post('/media/upload')
      .attach('file', Buffer.from('test'), 'test.png')
      .expect(201);
  });

  it('rejects malformed multipart and can process a subsequent request', async () => {
    await request(app.getHttpServer())
      .post('/media/upload')
      .set('Content-Type', 'multipart/form-data')
      .send('missing boundary')
      .expect(400);
    expect(createMedia).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post('/media/upload')
      .attach('file', Buffer.from('test'), 'test.png')
      .expect(201);
  });
});
