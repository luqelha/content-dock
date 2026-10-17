import { PrismaService } from '../../../../src/database/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { createRequire } from 'node:module';
const sharp: typeof import('sharp').default = createRequire(__filename)('sharp');
import { UserController } from '../../../../src/modules/user/user.controller';
import { UserService } from '../../../../src/modules/user/user.service';
import { FileVaultService } from '../../../../src/modules/storage/file-vault.service';

const mockUserService = {
  create: jest.fn(),
  findAll: jest.fn(),
  getProfile: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  updateAvatar: jest.fn(),
};

const mockVault = {
  save: jest.fn(),
  remove: jest.fn(),
  removeOtherAvatars: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            afterCommit: async (work: () => Promise<unknown>) => work(),
            afterRollback: jest.fn(),
          },
        },
        { provide: FileVaultService, useValue: mockVault },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('refuses global user creation', () => {
      expect(() => controller.create()).toThrow('Use workspace invitations');
      expect(mockUserService.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('refuses the global user directory', () => {
      const users = [{ id: '1', email: 'test@example.com' }];
      mockUserService.findAll.mockResolvedValueOnce(users);

      expect(() => controller.findAll()).toThrow('Use the workspace members endpoint');
      expect(mockUserService.findAll).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return a user profile', async () => {
      const user = { id: '1', email: 'test@example.com' };
      mockUserService.getProfile.mockResolvedValueOnce(user);

      const result = await controller.getProfile('1');
      expect(result).toEqual(user);
      expect(mockUserService.getProfile).toHaveBeenCalledWith('1');
    });
  });

  describe('findOne', () => {
    it('should return a user', async () => {
      const user = { id: '1', email: 'test@example.com' };
      mockUserService.findOne.mockResolvedValueOnce(user);

      const result = await controller.findOne('1');
      expect(result).toEqual(user);
    });
  });

  it('replaces an avatar and removes the previous and orphaned avatars', async () => {
    mockUserService.findOne.mockResolvedValueOnce({
      avatarUrl: '/uploads/previous.jpg',
    });
    const file = {
      buffer: await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } })
        .png()
        .toBuffer(),
      mimetype: 'image/png',
    } as Express.Multer.File;
    const result = await controller.uploadAvatar({ user: { userId: 'user-1' } }, file);

    expect(result.avatarUrl).toBe(`/uploads/${file.filename}`);
    expect(mockVault.save).toHaveBeenCalledWith(file.filename, file.buffer);
    expect(mockUserService.updateAvatar).toHaveBeenCalledWith('user-1', result.avatarUrl);
    expect(mockVault.remove).toHaveBeenCalledWith('previous.jpg');
    expect(mockVault.removeOtherAvatars).not.toHaveBeenCalled();
  });

  describe('update', () => {
    it('should update a user', async () => {
      const dto = { email: 'new@example.com' };
      mockUserService.update.mockResolvedValueOnce({ id: '1', ...dto });

      const result = await controller.update('1', dto);
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('remove', () => {
    it('refuses global user removal', () => {
      mockUserService.remove.mockResolvedValueOnce({ id: '1' });

      expect(() => controller.remove()).toThrow('Remove membership');
      expect(mockUserService.remove).not.toHaveBeenCalled();
    });
  });
});
