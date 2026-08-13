import { Test, TestingModule } from '@nestjs/testing';
import { TenantService } from '../../../../src/modules/tenant/tenant.service';
import { PrismaService } from '../../../../src/database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

const mockPrismaService = {
  tenant: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('TenantService', () => {
  let service: TenantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if domain already exists', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValueOnce({
        id: 'tenant-id',
        domain: 'existing.com',
      });
      await expect(
        service.create({ name: 'Test', domain: 'existing.com' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should create a tenant and a tenant user', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.tenant.create.mockResolvedValueOnce({
        id: 'tenant-id',
        name: 'Test',
        domain: 'test.com',
      });
      const result = await service.create({ name: 'Test', domain: 'test.com' }, 'user-1');
      expect(result).toEqual({ id: 'tenant-id', name: 'Test', domain: 'test.com' });
      expect(mockPrismaService.tenant.create).toHaveBeenCalledWith({
        data: {
          name: 'Test',
          domain: 'test.com',
          users: {
            create: {
              userId: 'user-1',
              role: 'ADMIN',
            },
          },
        },
      });
    });
  });

  describe('findAllForUser', () => {
    it('should return tenants for a user', async () => {
      const tenants = [{ id: '1', name: 'Tenant 1', users: [{ role: 'ADMIN' }] }];
      mockPrismaService.tenant.findMany.mockResolvedValueOnce(tenants);
      const result = await service.findAllForUser('user-1');
      expect(result).toEqual([{ id: '1', name: 'Tenant 1', role: 'ADMIN', users: undefined }]);
      expect(mockPrismaService.tenant.findMany).toHaveBeenCalledWith({
        where: { users: { some: { userId: 'user-1' } } },
        include: {
          users: {
            where: { userId: 'user-1' },
            select: { role: true },
          },
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a tenant', async () => {
      const tenant = { id: '1', name: 'Tenant 1' };
      mockPrismaService.tenant.findUnique.mockResolvedValueOnce(tenant);
      const result = await service.findOne('1');
      expect(result).toEqual(tenant);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if tenant not found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValueOnce(null);
      await expect(service.update('999', { name: 'Updated' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if domain is taken by another tenant', async () => {
      mockPrismaService.tenant.findUnique
        .mockResolvedValueOnce({ id: '1', name: 'Tenant 1' }) // findOne
        .mockResolvedValueOnce({ id: '2', domain: 'taken.com' }); // check domain

      await expect(service.update('1', { domain: 'taken.com' })).rejects.toThrow(ConflictException);
    });

    it('should update and return the tenant', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValueOnce({ id: '1', name: 'Tenant 1' });
      const updated = { id: '1', name: 'Updated' };
      mockPrismaService.tenant.update.mockResolvedValueOnce(updated);

      const result = await service.update('1', { name: 'Updated' });
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if tenant not found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValueOnce(null);
      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });

    it('should remove the tenant', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValueOnce({ id: '1', name: 'Tenant 1' });
      mockPrismaService.tenant.delete.mockResolvedValueOnce({ id: '1' });
      const result = await service.remove('1');
      expect(result).toEqual({ message: 'Tenant with ID 1 deleted successfully' });
    });
  });
});
