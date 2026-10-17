import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../../../../src/modules/user/user.service';
import { PrismaService } from '../../../../src/database/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    mockPrismaService.user.findFirst.mockReset().mockResolvedValue(null);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: { client: mockPrismaService },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a user', async () => {
      const dto = { email: 'test@test.com', password: 'password123' };
      const hashedPassword = 'hashedPassword';

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      mockPrismaService.user.create.mockResolvedValue({
        id: '1',
        email: dto.email,
        passwordHash: hashedPassword,
        refreshToken: null,
      });

      const result = await service.create(dto);

      expect(result).toEqual({ id: '1', email: dto.email });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: dto.email,
          passwordHash: hashedPassword,
        },
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      const dto = { email: 'test@test.com', password: 'password123' };
      mockPrismaService.user.findUnique.mockResolvedValue({ id: '1' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('registerCredentials', () => {
    const dto = { email: 'new@example.com', password: 'a unique passphrase' };
    it.each([0, 1])('hashes at cost 12 even when insert count is %s', async (count) => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('cost-12-hash');
      mockPrismaService.user.createMany.mockResolvedValue({ count });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'new-id' });
      const result = await service.registerCredentials(dto);
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect(mockPrismaService.user.createMany).toHaveBeenCalledWith({
        data: { email: dto.email, passwordHash: 'cost-12-hash' },
        skipDuplicates: true,
      });
      expect(result).toEqual(count ? { id: 'new-id' } : null);
      if (!count) expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
    it('does not insert or overwrite a legacy mixed-case account', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'legacy-user' });
      expect(await service.registerCredentials(dto)).toBeNull();
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect(mockPrismaService.user.createMany).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });

  it.each([[], [{ id: 'legacy-user' }], [{ id: 'one' }, { id: 'two' }]])(
    'only authenticates an unambiguous case-insensitive email match: %j',
    async (...matches) => {
      mockPrismaService.user.findMany.mockResolvedValue(matches);
      expect(await service.findByEmailForAuth('legacy@example.com')).toEqual(
        matches.length === 1 ? matches[0] : null,
      );
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { email: { equals: 'legacy@example.com', mode: 'insensitive' } },
        take: 2,
      });
    },
  );

  describe('findOne', () => {
    it('should return a user if found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        passwordHash: 'hash',
        refreshToken: 'token',
      });

      const result = await service.findOne('1');

      expect(result).toEqual({ id: '1', email: 'test@test.com' });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });
  describe('update credential boundary', () => {
    it('rejects a user removed between profile and credential lookup without writing', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: '1', email: 'test@example.test', passwordHash: 'old-hash' })
        .mockResolvedValueOnce(null);
      await expect(
        service.update('1', { password: 'a new passphrase', currentPassword: 'old password' }),
      ).rejects.toThrow('Incorrect current password.');
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('never forwards plaintext credential fields into Prisma updates', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.test',
        passwordHash: 'old-hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      mockPrismaService.user.update.mockResolvedValue({
        id: '1',
        email: 'test@example.test',
        passwordHash: 'new-hash',
        refreshToken: null,
      });
      await service.update('1', {
        firstName: 'Name',
        password: 'a new passphrase',
        currentPassword: 'old password',
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { firstName: 'Name', passwordHash: 'new-hash', refreshToken: null },
      });
    });
  });
});
