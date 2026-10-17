import { PrismaService } from '../../src/database/prisma.service';
import { ContentService } from '../../src/modules/cms/services/content.service';
import { QueryContentDto } from '../../src/modules/cms/dto/query-content.dto';
import { assertTestDatabase } from '../database-safety';
import { clearDatabase, setupTestTenantAndUser } from './int-test-utils';
import {
  contentFullPageSchema,
  contentSummaryPageSchema,
} from '../../../web-admin/src/lib/contracts';

describe('Content contract against PostgreSQL projections', () => {
  const prisma = new PrismaService();
  const service = new ContentService(prisma);
  beforeAll(async () => {
    assertTestDatabase();
    await prisma.$connect();
  });
  afterAll(async () => prisma.$disconnect());
  it('preserves full/summary projections, nullable relations, date serialization and tenant isolation', async () => {
    await clearDatabase(prisma);
    const { tenant, user } = await setupTestTenantAndUser(prisma);
    const other = await prisma.tenant.create({ data: { name: 'Other workspace' } });
    const category = await prisma.category.create({
      data: { tenantId: tenant.id, name: 'Root', slug: 'root' },
    });
    await prisma.content.createMany({
      data: [
        {
          tenantId: tenant.id,
          authorId: user.id,
          title: 'Draft',
          slug: 'draft',
          body: 'Draft body',
        },
        {
          tenantId: tenant.id,
          authorId: user.id,
          title: 'Published',
          slug: 'published',
          body: 'Published body',
          status: 'PUBLISHED',
          publishedAt: new Date(),
          categoryId: category.id,
        },
        {
          tenantId: other.id,
          authorId: user.id,
          title: 'Foreign',
          slug: 'foreign',
          body: 'Private',
        },
      ],
    });
    const full = contentFullPageSchema.parse(
      JSON.parse(JSON.stringify(await service.findAll(tenant.id, new QueryContentDto()))),
    );
    const summary = contentSummaryPageSchema.parse(
      JSON.parse(
        JSON.stringify(
          await service.findAll(
            tenant.id,
            Object.assign(new QueryContentDto(), { summary: 'true' as const }),
          ),
        ),
      ),
    );
    expect(full.meta.itemCount).toBe(2);
    expect(summary.meta).toEqual(full.meta);
    expect(summary.data.map((item) => item.id).sort()).toEqual(
      full.data.map((item) => item.id).sort(),
    );
    expect(
      summary.data.every(
        (item) =>
          item.tenantId === tenant.id && !Object.prototype.hasOwnProperty.call(item, 'body'),
      ),
    ).toBe(true);
    expect(full.data.find((item) => item.slug === 'draft')).toMatchObject({
      body: 'Draft body',
      category: null,
      publishedAt: null,
    });
    expect(full.data.find((item) => item.slug === 'published')).toMatchObject({
      body: 'Published body',
      category: { parentId: null, id: category.id },
    });
  });
});
