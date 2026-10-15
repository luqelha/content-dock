import { INestApplication } from '@nestjs/common';
import { createApplicationValidationPipe } from '../../src/common/pipes/application-validation.pipe';
import { assertTestDatabase } from '../database-safety';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaClientExceptionFilter } from '../../src/common/filters/prisma-client-exception.filter';

export async function createTestApp(): Promise<INestApplication> {
  assertTestDatabase();
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(createApplicationValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter(), new PrismaClientExceptionFilter());
  await app.init();
  return app;
}

export async function clearDatabase(prisma: PrismaService) {
  assertTestDatabase();
  const tableNames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tableNames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  try {
    if (tables.length > 0) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  } catch (error) {
    throw error;
  }
}

export async function setupTestUserAndTenant(app: INestApplication, role = 'ADMIN') {
  const prisma = app.get(PrismaService);
  const jwtService = app.get(JwtService);

  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      passwordHash,
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      name: `Tenant ${Date.now()}`,
      domain: `test-${Date.now()}.example.com`,
    },
  });

  await prisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role,
    },
  });

  const token = jwtService.sign({ sub: user.id, email: user.email, token_use: 'access' });

  return { user, tenant, token };
}
