import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, clearDatabase, setupTestUserAndTenant } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'node:module';
const sharp: typeof import('sharp').default = createRequire(__filename)('sharp');

describe('Media Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantToken: string;
  let tenantId: string;
  let testFilePath: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    // A real decoded PNG is required; MIME labels cannot make arbitrary bytes an image.
    testFilePath = path.join(__dirname, 'test-image.png');
    fs.writeFileSync(
      testFilePath,
      await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } })
        .png()
        .toBuffer(),
    );
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
    const setup = await setupTestUserAndTenant(app, 'ADMIN');
    tenantToken = setup.token;
    tenantId = setup.tenant.id;
  });

  afterAll(async () => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (app) {
      await app.close();
    }
  });

  describe('Media Upload', () => {
    it('/media/upload (POST)', async () => {
      const response = await request(app.getHttpServer())
        .post('/media/upload')
        .set('Authorization', `Bearer ${tenantToken}`)
        .set('x-tenant-id', tenantId)
        .attach('file', testFilePath)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('url');
    });

    it('/media (GET)', async () => {
      // First upload
      await request(app.getHttpServer())
        .post('/media/upload')
        .set('Authorization', `Bearer ${tenantToken}`)
        .set('x-tenant-id', tenantId)
        .attach('file', testFilePath);

      const response = await request(app.getHttpServer())
        .get('/media')
        .set('Authorization', `Bearer ${tenantToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('/media/:id (DELETE)', async () => {
      // First upload
      const uploadRes = await request(app.getHttpServer())
        .post('/media/upload')
        .set('Authorization', `Bearer ${tenantToken}`)
        .set('x-tenant-id', tenantId)
        .attach('file', testFilePath)
        .expect(201);

      const id = uploadRes.body.id;

      await request(app.getHttpServer())
        .delete(`/media/${id}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      // Verify it's deleted from db
      const response = await request(app.getHttpServer())
        .get('/media')
        .set('Authorization', `Bearer ${tenantToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      const found = response.body.find((m: any) => m.id === id);
      expect(found).toBeUndefined();
    });
  });
});
