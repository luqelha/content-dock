import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../src/database/prisma.service';
import { CompressionService } from '../../../src/modules/export/compression.service';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { ExportService } from '../../../src/modules/export/export.service';
import {
  JobStatus,
  parseExportJob,
  parseExportStatus,
} from '../../../src/modules/export/export-job';
import { WorkerController } from '../../../src/modules/export/worker.controller';
import { JwtStrategy } from '../../../src/modules/auth/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '../../../src/modules/auth/strategies/jwt-refresh.strategy';
import { exportJobSchema, exportStatusSchema } from '../../../../web-admin/src/lib/contracts';

jest.mock('../../../src/modules/export/compression.service', () => ({
  CompressionService: class {},
}));

describe('Export and authentication boundary contracts', () => {
  const job = {
    jobId: 'job',
    tenantId: 'tenant',
    userId: 'owner',
    startDate: '2026-10-01',
    endDate: '2026-10-11',
    createdAt: '2026-10-01T00:00:00.000Z',
    status: 'Pending',
    progress: 0,
  };
  it.each(Object.values(JobStatus))(
    'round-trips authoritative %s through producer and consumer',
    async (status) => {
      const findFirst = jest.fn().mockResolvedValue({
        id: job.jobId,
        tenantId: job.tenantId,
        userId: job.userId,
        status,
        payload: job,
      });
      const module = await Test.createTestingModule({
        providers: [
          ExportService,
          { provide: 'RABBITMQ_SERVICE', useValue: { emit: () => of(undefined) } },
          { provide: PrismaService, useValue: { exportTask: { findFirst } } },
        ],
      }).compile();
      const service = module.get(ExportService);
      const result = await service.getJobStatus(job.jobId, job.tenantId, job.userId);
      expect(exportJobSchema.parse(JSON.parse(JSON.stringify(result)))).toEqual({ ...job, status });
      expect(exportStatusSchema.parse(status)).toBe(parseExportStatus(status));
    },
  );

  it.each([
    null,
    {},
    { ...job, status: 'Unknown' },
    { ...job, progress: 101 },
    { ...job, startDate: 'invalid' },
    { ...job, filename: 123 },
  ])('rejects malformed stored jobs: %j', (value) => {
    expect(() => parseExportJob(value)).toThrow('Invalid stored export');
  });

  it.each([null, { ...job, startDate: null }])(
    'fails a claimed corrupt job without starting compression or losing the fencing token: %j',
    async (payload) => {
      const task = {
        id: 'job',
        tenantId: 'tenant',
        userId: 'owner',
        payload,
      };
      const updateMany = jest.fn().mockResolvedValue({ count: 1 });
      const compressLogs = jest.fn();
      const ack = jest.fn();
      const nack = jest.fn();
      const module = await Test.createTestingModule({
        controllers: [WorkerController],
        providers: [
          { provide: CompressionService, useValue: { compressLogs } },
          {
            provide: PrismaService,
            useValue: { exportTask: { updateMany, findFirst: async () => task } },
          },
        ],
      }).compile();
      const worker = module.get(WorkerController);
      const { RmqContext } = await import('@nestjs/microservices');
      await worker.handleLogExport(
        { jobId: 'job' },
        new RmqContext([{}, { ack, nack }, 'export_logs']),
      );
      expect(compressLogs).not.toHaveBeenCalled();
      expect(updateMany.mock.calls[1][0]).toMatchObject({
        where: { leaseToken: updateMany.mock.calls[0][0].data.leaseToken },
        data: { status: 'Failed', leaseToken: null },
      });
      expect(ack).toHaveBeenCalledTimes(1);
      expect(nack).not.toHaveBeenCalled();
    },
  );

  it.each([JwtStrategy, JwtRefreshStrategy])(
    'fails construction when the required JWT secret is missing',
    (Strategy) => {
      const config = new ConfigService({});
      // Isolate the missing-value case from environment loaded by other suites.
      jest.spyOn(config, 'get').mockReturnValue(undefined);
      expect(() => new Strategy(config)).toThrow();
    },
  );

  it.each([null, [], {}, { sub: 1, token_use: 'access' }])(
    'rejects malformed access claims: %j',
    async (payload) => {
      const strategy = new JwtStrategy(new ConfigService({ JWT_SECRET: 'contract-test-secret' }));
      await expect(strategy.validate(payload)).rejects.toThrow('Invalid access token');
    },
  );
});
