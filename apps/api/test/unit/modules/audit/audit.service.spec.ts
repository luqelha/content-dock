import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../../src/modules/audit/audit.service';
import { PrismaService } from '../../../../src/database/prisma.service';
import { Logger } from '@nestjs/common';

const mockPrismaService = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: { client: mockPrismaService },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    // spy on logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logActivity', () => {
    it('should create an audit log', async () => {
      mockPrismaService.auditLog.create.mockResolvedValueOnce({ id: '1' });
      const dto = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        action: 'CREATE_USER',
        entity: 'User',
        entityId: 'user-2',
        details: { key: 'value' },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };
      await service.logActivity(dto);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          details: dto.details,
        },
      });
    });

    it('propagates audit write failure so the business transaction cannot commit', async () => {
      mockPrismaService.auditLog.create.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.logActivity({ action: 'TEST' } as any)).rejects.toThrow('DB Error');
    });
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const logs = [{ id: '1' }];
      mockPrismaService.auditLog.findMany.mockResolvedValueOnce(logs);
      mockPrismaService.auditLog.count.mockResolvedValueOnce(1);

      const query = { page: 1, limit: 10, action: 'TEST', userId: 'user-1', entity: 'Test' };
      const result = await service.getAuditLogs('tenant-1', query);

      expect(result).toEqual({
        data: logs,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', action: 'TEST', userId: 'user-1', entity: 'Test' },
        }),
      );
    });
  });
});
