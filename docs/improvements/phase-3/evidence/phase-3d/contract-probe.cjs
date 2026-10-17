// Isolated source probes; Prisma is a stub, no HTTP listener or service connection.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../../..');
const apiRequire = createRequire(path.join(root, 'apps/api/package.json'));
apiRequire('ts-node').register({ project: path.join(root, 'apps/api/tsconfig.json'), transpileOnly: true });
apiRequire('reflect-metadata');
const src = name => apiRequire(path.join(root, 'apps/api/src', name));
const ts = apiRequire('typescript');

async function main() {
  const { ContentController } = src('modules/cms/controllers/content.controller.ts');
  const { ContentService } = src('modules/cms/services/content.service.ts');
  const { MediaController } = src('modules/media/media.controller.ts');
  const { MediaService } = src('modules/media/media.service.ts');
  const { JwtAuthGuard } = src('modules/auth/guards/jwt-auth.guard.ts');
  const { RbacGuard } = src('common/guards/rbac.guard.ts');
  const { CacheInterceptor } = src('common/interceptors/cache.interceptor.ts');
  const { ListPageDto } = src('common/dto/list-page.dto.ts');
  const { QueryContentDto } = src('modules/cms/dto/query-content.dto.ts');
  const { createApplicationValidationPipe } = src('common/pipes/application-validation.pipe.ts');
  const { Test } = apiRequire('@nestjs/testing');
  const { SwaggerModule, DocumentBuilder } = apiRequire('@nestjs/swagger');
  const module = await Test.createTestingModule({
    controllers: [ContentController, MediaController],
    providers: [{ provide: ContentService, useValue: {} }, { provide: MediaService, useValue: {} }],
  }).overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(RbacGuard).useValue({ canActivate: () => true })
    .overrideInterceptor(CacheInterceptor).useValue({ intercept: (_ctx, next) => next.handle() }).compile();
  const app = module.createNestApplication({ logger: false });
  let doc;
  try {
    app.setGlobalPrefix('api');
    doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Isolated contract probe').setVersion('1').build());
  } finally { await app.close(); }
  const contentResponse = doc.paths['/api/contents'].get.responses['200'];
  const mediaResponse = doc.paths['/api/media'].get.responses['200'];
  const pipe = createApplicationValidationPipe();
  const query = value => pipe.transform(value, { type: 'query', metatype: ListPageDto });
  const defaults = await query({});
  assert.equal(defaults.take, 50);
  for (const bad of [{ take: '101' }, { page: '0' }, { page: '100001' }, { take: 'NaN' }]) {
    await assert.rejects(() => query(bad));
  }
  let captured;
  const media = new MediaService({ client: { media: { findMany: async args => { captured = args; return []; } } } }, {});
  await media.listMedia('fixture-tenant', await query({ page: '2', take: '100' }));
  assert.equal(captured.where.tenantId, 'fixture-tenant');
  assert.equal(captured.skip, 100);
  assert.equal(captured.take, 100);
  const calls = [];
  const fixture = { id: 'fixture-content', body: 'full body', tenantId: 'fixture-tenant' };
  const content = new ContentService({ client: { content: {
    count: async args => { calls.push({ operation: 'count', args }); return 1; },
    findMany: async args => { calls.push({ operation: 'findMany', args }); return args.select.body ? [fixture] : [{ id: fixture.id, tenantId: fixture.tenantId }]; },
  } } });
  const summary = await content.findAll('fixture-tenant', Object.assign(new QueryContentDto(), { summary: 'true' }));
  const full = await content.findAll('fixture-tenant', new QueryContentDto());
  assert.equal(Object.hasOwn(summary.data[0], 'body'), false);
  assert.equal(full.data[0].body, 'full body');
  const inventory = {};
  for (const workspace of ['api', 'web-admin']) {
    const base = path.join(root, 'apps', workspace, 'src');
    const files = [];
    const walk = dir => { for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name);
      if (item.isDirectory()) walk(file);
      else if (/\.tsx?$/.test(file) && !file.endsWith('.d.ts')) files.push(file);
    } };
    walk(base);
    const occurrences = [];
    let jsonCalls = 0;
    for (const file of files) {
      const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      const visit = node => {
        if (node.kind === ts.SyntaxKind.AnyKeyword) occurrences.push({ file: path.relative(root, file).replaceAll('\\', '/'), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'json') jsonCalls++;
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    inventory[workspace] = { sourceFiles: files.length, explicitAnyCount: occurrences.length, jsonMethodCalls: jsonCalls, occurrences };
  }
  const result = {
    at: new Date().toISOString(), limitations: 'Controller OpenAPI generated in isolated Nest container. Guards replaced solely for schema generation, no requests/auth tested. Service projections use a Prisma stub, not SQL.',
    contentList200: contentResponse, mediaList200: mediaResponse,
    contentListHasResponseSchema: Boolean(contentResponse.content),
    mediaListHasResponseSchema: Boolean(mediaResponse.content),
    pagination: { defaults: { page: defaults.page, take: defaults.take }, invalidInputsRejected: 4, mediaQuery: captured },
    contentProjection: { summaryHasBody: Object.hasOwn(summary.data[0], 'body'), fullHasBody: Object.hasOwn(full.data[0], 'body'), calls },
    inventory,
  };
  fs.writeFileSync(path.join(__dirname, 'contract-probe.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ contentListHasResponseSchema: result.contentListHasResponseSchema, mediaListHasResponseSchema: result.mediaListHasResponseSchema, paginationChecksPassed: true, summaryHasBody: false, explicitAny: Object.fromEntries(Object.entries(inventory).map(([k,v]) => [k, v.explicitAnyCount])) }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
