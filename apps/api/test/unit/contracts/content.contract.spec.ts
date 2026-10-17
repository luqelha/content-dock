import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import * as request from 'supertest';
import { ContentController } from '../../../src/modules/cms/controllers/content.controller';
import { ContentService } from '../../../src/modules/cms/services/content.service';
import { PrismaService } from '../../../src/database/prisma.service';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../../src/common/guards/rbac.guard';
import { CacheInterceptor } from '../../../src/common/interceptors/cache.interceptor';
import { createApplicationValidationPipe } from '../../../src/common/pipes/application-validation.pipe';
import type { ApplicationRequest } from '../../../src/common/types/http-request';
import { ContentStatus } from '@prisma/client';
import {
  ContentSummary,
  ContentFull,
} from '../../../src/modules/cms/entities/content-list.contract';
import { QueryContentDto } from '../../../src/modules/cms/dto/query-content.dto';
import { PageDto } from '../../../src/common/dto/page.dto';
import {
  contentFullPageSchema,
  contentSummaryPageSchema,
  contentStatusSchema,
} from '../../../../web-admin/src/lib/contracts';

// These assignments are checked by tsc, but must never call a service at runtime.
function compileContract(service: ContentService) {
  const summary: Promise<PageDto<ContentSummary>> = service.findAll(
    'tenant',
    Object.assign(new QueryContentDto(), { summary: 'true' as const }),
  );
  const full: Promise<PageDto<ContentFull>> = service.findAll(
    'tenant',
    Object.assign(new QueryContentDto(), { summary: 'false' as const }),
  );
  void summary;
  void full;
  const read = (item: ContentSummary) => {
    // @ts-expect-error A summary cannot be consumed as full content.
    return item.body;
  };
  void read;
}
void compileContract;

describe('Content producer/consumer contract', () => {
  let app: INestApplication;
  const row = {
    id: 'content-1',
    title: 'Title',
    slug: 'title',
    body: '<p>Body</p>',
    status: 'DRAFT',
    publishedAt: null,
    authorId: 'author-1',
    tenantId: 'tenant-1',
    categoryId: null,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-02T00:00:00.000Z'),
    category: null,
    author: { id: 'author-1', email: 'author@example.test', firstName: null, lastName: null },
  };
  const findMany = jest.fn(async (args: Prisma.ContentFindManyArgs) => {
    if (args.select?.body) return [row];
    const { body, ...summary } = row;
    return [summary];
  });
  const count = jest.fn(async () => 1);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        ContentService,
        { provide: PrismaService, useValue: { client: { content: { findMany, count } } } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RbacGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(CacheInterceptor)
      .useValue({
        intercept: (_context: unknown, next: { handle: () => unknown }) => next.handle(),
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    app.use((req: ApplicationRequest, _res: unknown, next: () => void) => {
      req.tenant = { id: 'tenant-1' };
      req.user = { userId: 'author-1' };
      next();
    });
    app.useGlobalPipes(createApplicationValidationPipe());
    await app.init();
  });
  afterAll(async () => app?.close());
  beforeEach(() => jest.clearAllMocks());

  it.each(['', '?summary=false', '?summary=true'])(
    'validates actual serialized HTTP payload for %s',
    async (query) => {
      const response = await request(app.getHttpServer()).get(`/contents${query}`).expect(200);
      const summary = query.includes('true');
      const parsed = (summary ? contentSummaryPageSchema : contentFullPageSchema).parse(
        response.body,
      );
      expect(parsed.meta).toEqual({
        page: 1,
        take: 10,
        itemCount: 1,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
      expect(Object.prototype.hasOwnProperty.call(parsed.data[0], 'body')).toBe(!summary);
      expect(parsed.data[0]).toMatchObject({
        category: null,
        publishedAt: null,
        createdAt: row.createdAt.toISOString(),
        author: row.author,
      });
      expect(findMany.mock.calls[0][0].where).toEqual({ tenantId: 'tenant-1' });
      expect(findMany.mock.calls[0][0].select?.author).toEqual({
        select: { id: true, email: true, firstName: true, lastName: true },
      });
    },
  );

  it('accepts empty pages and computes pagination without changing the envelope', async () => {
    findMany.mockResolvedValueOnce([]);
    count.mockResolvedValueOnce(0);
    const response = await request(app.getHttpServer())
      .get('/contents?summary=true&page=2&take=20')
      .expect(200);
    expect(contentSummaryPageSchema.parse(response.body)).toMatchObject({
      data: [],
      meta: { page: 2, take: 20, pageCount: 0, hasPreviousPage: true, hasNextPage: false },
    });
  });

  it('rejects invalid projection selectors before querying', async () => {
    await request(app.getHttpServer()).get('/contents?summary=invalid').expect(400);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('keeps consumer enum values aligned with Prisma', () => {
    expect(contentStatusSchema.options).toEqual(Object.values(ContentStatus));
  });

  it('publishes the paginated full/summary schema including nullable relations and dates', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Contract').setVersion('1').build(),
    );
    expect({
      response: document.paths['/contents'].get?.responses['200'],
      schemas: Object.fromEntries(
        Object.entries(document.components?.schemas ?? {}).filter(([key]) =>
          [
            'ContentSummaryEntity',
            'ContentFullEntity',
            'ContentAuthorEntity',
            'CategoryEntity',
            'PageMetaDto',
          ].includes(key),
        ),
      ),
    }).toMatchSnapshot();
  });
});
