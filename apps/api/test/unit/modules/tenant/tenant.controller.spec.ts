import { Test, TestingModule } from '@nestjs/testing';
import { TenantController } from '../../../../src/modules/tenant/tenant.controller';
import { TenantService } from '../../../../src/modules/tenant/tenant.service';

import { JwtAuthGuard } from '../../../../src/modules/auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../../../src/common/guards/rbac.guard';

const mockTenantService = {
  create: jest.fn(),
  findAllForUser: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('TenantController', () => {
  let controller: TenantController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantController],
      providers: [
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RbacGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TenantController>(TenantController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a tenant', async () => {
      const dto = { name: 'Test' };
      const req = { user: { userId: 'user-1' } };
      mockTenantService.create.mockResolvedValueOnce({ id: '1', ...dto });

      const result = await controller.create(dto, req);
      expect(result).toEqual({ id: '1', ...dto });
      expect(mockTenantService.create).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('findAll', () => {
    it('should find all tenants for user', async () => {
      const req = { user: { userId: 'user-1' } };
      const tenants = [{ id: '1' }];
      mockTenantService.findAllForUser.mockResolvedValueOnce(tenants);

      const result = await controller.findAll(req);
      expect(result).toEqual(tenants);
      expect(mockTenantService.findAllForUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('findOne', () => {
    it('should find a tenant by id', async () => {
      mockTenantService.findOne.mockResolvedValueOnce({ id: '1' });
      const result = await controller.findOne('1');
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('update', () => {
    it('should update a tenant', async () => {
      const dto = { name: 'Updated' };
      mockTenantService.update.mockResolvedValueOnce({ id: '1', ...dto });
      const result = await controller.update('1', dto);
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('remove', () => {
    it('should remove a tenant', async () => {
      mockTenantService.remove.mockResolvedValueOnce({ message: 'Success' });
      const result = await controller.remove('1');
      expect(result).toEqual({ message: 'Success' });
    });
  });
});
