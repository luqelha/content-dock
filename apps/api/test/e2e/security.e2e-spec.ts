import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { createTestApp, clearDatabase, setupTestUserAndTenant } from './test-utils';

describe('Security boundaries (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let owner: Awaited<ReturnType<typeof setupTestUserAndTenant>>;
  const auth = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    token = owner.token,
    tenantId = owner.tenant.id,
  ) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId);
  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });
  beforeEach(async () => {
    await clearDatabase(prisma);
    owner = await setupTestUserAndTenant(app);
  });
  afterAll(async () => {
    await app?.close();
  });

  it('denies unauthenticated and cross-tenant lists', async () => {
    await request(app.getHttpServer()).get('/categories').expect(401);
    const other = await setupTestUserAndTenant(app);
    for (const path of [
      '/categories',
      '/contents',
      '/media',
      '/audit-logs',
      '/analytics/dashboard',
    ]) {
      await auth('get', path, owner.token, other.tenant.id).expect(403);
    }
  });

  it('enforces viewer/editor/admin boundaries and immediate membership revocation', async () => {
    const viewer = await setupTestUserAndTenant(app, 'VIEWER');
    await auth('get', '/contents', viewer.token, viewer.tenant.id).expect(200);
    await auth('post', '/categories', viewer.token, viewer.tenant.id)
      .send({ name: 'No', slug: 'no' })
      .expect(403);
    await auth('post', '/export/logs', viewer.token, viewer.tenant.id)
      .send({ startDate: '2026-10-01', endDate: '2026-10-11' })
      .expect(403);
    await prisma.tenantUser.updateMany({
      where: { userId: viewer.user.id },
      data: { role: 'EDITOR' },
    });
    await auth('post', '/categories', viewer.token, viewer.tenant.id)
      .send({ name: 'Yes', slug: 'yes' })
      .expect(201);
    await auth('post', `/tenants/${viewer.tenant.id}/invitations`, viewer.token, viewer.tenant.id)
      .send({ email: 'new@example.com', role: 'VIEWER' })
      .expect(403);
    await prisma.tenantUser.deleteMany({ where: { userId: viewer.user.id } });
    await auth('get', '/contents', viewer.token, viewer.tenant.id).expect(403);
  });

  it('does not read or mutate another tenant category by ID', async () => {
    const other = await setupTestUserAndTenant(app);
    const category = await prisma.category.create({
      data: { tenantId: other.tenant.id, name: 'Private', slug: 'private' },
    });
    await auth('get', `/categories/${category.id}`).expect(404);
    await auth('patch', `/categories/${category.id}`).send({ name: 'Hijack' }).expect(404);
    await auth('delete', `/categories/${category.id}`).expect(404);
    await auth('post', '/categories')
      .send({ name: 'Child', slug: 'child', parentId: category.id })
      .expect(404);
    expect(await prisma.category.findUnique({ where: { id: category.id } })).toMatchObject({
      name: 'Private',
    });
  });

  it('rejects arbitrary user profile reads and global user creation', async () => {
    const other = await setupTestUserAndTenant(app);
    await auth('get', `/users/${other.user.id}`).expect(403);
    await auth('patch', `/users/${other.user.id}`).send({ firstName: 'Hijack' }).expect(403);
    await auth('post', '/users')
      .send({ email: 'new@example.com', password: 'password123' })
      .expect(403);
  });

  it('bounds list pages and rejects invalid page input', async () => {
    await prisma.category.createMany({
      data: Array.from({ length: 65 }, (_, i) => ({
        tenantId: owner.tenant.id,
        name: `Category ${i}`,
        slug: `category-${i}`,
      })),
    });
    const first = await auth('get', '/categories').expect(200);
    const second = await auth('get', '/categories?page=2&take=50').expect(200);
    expect(first.body).toHaveLength(50);
    expect(second.body).toHaveLength(15);
    expect(new Set([...first.body, ...second.body].map((item) => item.id)).size).toBe(65);
    for (const query of ['page=0', 'page=1.5', 'take=101', 'take=-1', 'page=100001'])
      await auth('get', `/categories?${query}`).expect(400);
    await auth('get', '/media?take=101').expect(400);
    await auth('get', `/tenants/${owner.tenant.id}/members?take=101`).expect(400);
  });

  it('provides opt-in content summaries without changing the default body contract', async () => {
    await auth('post', '/contents')
      .send({ title: 'Summary', body: 'Full body', status: 'DRAFT' })
      .expect(201);
    expect((await auth('get', '/contents').expect(200)).body.data[0].body).toBe('Full body');
    expect(
      (await auth('get', '/contents?summary=true').expect(200)).body.data[0],
    ).not.toHaveProperty('body');
  });

  it('rolls back business mutations when audit persistence fails', async () => {
    const spy = jest
      .spyOn(app.get(AuditService), 'logActivity')
      .mockRejectedValueOnce(new Error('Simulated audit outage'));
    try {
      await auth('post', '/categories').send({ name: 'Rollback', slug: 'rollback' }).expect(500);
      expect(await prisma.category.count({ where: { tenantId: owner.tenant.id } })).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it('invalidates cached content when its category or author changes', async () => {
    const category = (
      await auth('post', '/categories').send({ name: 'Old', slug: 'cache-category' }).expect(201)
    ).body;
    await auth('post', '/contents')
      .send({ title: 'Cached', body: 'Body', categoryId: category.id })
      .expect(201);
    expect((await auth('get', '/contents').expect(200)).body.data[0].category.name).toBe('Old');
    await auth('patch', `/categories/${category.id}`).send({ name: 'New' }).expect(200);
    expect((await auth('get', '/contents').expect(200)).body.data[0].category.name).toBe('New');
    await auth('patch', `/users/${owner.user.id}`)
      .send({ firstName: 'Updated author' })
      .expect(200);
    expect((await auth('get', '/contents').expect(200)).body.data[0].author.firstName).toBe(
      'Updated author',
    );
    await auth('delete', `/categories/${category.id}`).expect(200);
    expect((await auth('get', '/contents').expect(200)).body.data[0].category).toBeNull();
  });

  it('logs the authenticated actor without trusting the login tenant header', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-id', owner.tenant.id)
      .send({ email: owner.user.email, password: 'password123' })
      .expect(200);
    const log = await prisma.auditLog.findFirst({ where: { action: 'LOGIN' } });
    expect(log).toMatchObject({ userId: owner.user.id, entityId: owner.user.id, tenantId: null });
    if (!log) throw new Error('Expected persisted audit log');
    expect(JSON.stringify(log.details)).not.toContain('password123');
  });

  it('rotates concurrent refreshes consistently and rejects token purpose swapping', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: owner.user.email, password: 'password123' })
      .expect(200);
    const old = login.body.refresh_token;
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${old}`)
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .expect(401);
    const refresh = () =>
      request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${old}`)
        .expect(200);
    const [a, b] = await Promise.all([refresh(), refresh()]);
    expect(a.body.refresh_token).toBe(b.body.refresh_token);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${a.body.access_token}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${old}`)
      .expect(403);
  });
});
