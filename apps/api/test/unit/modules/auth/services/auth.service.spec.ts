import { PrismaService } from '../../../../../src/database/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AuthService,
  REGISTRATION_MESSAGE,
} from '../../../../../src/modules/auth/services/auth.service';
import { UserService } from '../../../../../src/modules/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { RedisService } from '../../../../../src/modules/redis/redis.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUserService = {
    registerCredentials: jest.fn(),
    findByEmailForAuth: jest.fn(),
    findByIdForAuth: jest.fn(),
    updateRefreshToken: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'JWT_REFRESH_SECRET') return 'refresh_secret';
      if (key === 'JWT_REFRESH_EXPIRATION') return defaultValue || '7d';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: {
            afterCommit: async (work: () => Promise<unknown>) => work(),
            afterRollback: jest.fn(),
          },
        },
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: { clearUserRbacCache: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a user', async () => {
      const registerDto = { email: 'test@test.com', password: 'password' };
      const expectedUser = { id: '1', email: 'test@test.com' };

      mockUserService.registerCredentials.mockResolvedValue(expectedUser);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        message: REGISTRATION_MESSAGE,
        user: expectedUser,
      });
      expect(mockUserService.registerCredentials).toHaveBeenCalledWith(registerDto);
    });

    it('returns the same message if email exists without issuing tokens', async () => {
      mockUserService.registerCredentials.mockResolvedValue(null);

      await expect(
        service.register({ email: 'test@test.com', password: 'password' }),
      ).resolves.toEqual({ message: REGISTRATION_MESSAGE, user: null });
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
      expect(mockUserService.updateRefreshToken).not.toHaveBeenCalled();
    });

    it('propagates storage failures instead of falsely reporting success', async () => {
      mockUserService.registerCredentials.mockRejectedValue(new Error('storage unavailable'));
      await expect(
        service.register({ email: 'test@test.com', password: 'test passphrase' }),
      ).rejects.toThrow('storage unavailable');
    });
  });

  describe('login', () => {
    it('should login user and return tokens', async () => {
      const loginDto = { email: 'test@test.com', password: 'password' };
      const user = { id: '1', email: 'test@test.com', passwordHash: 'hash' };

      mockUserService.findByEmailForAuth.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      mockJwtService.signAsync
        .mockResolvedValueOnce('access_token')
        .mockResolvedValueOnce('refresh_token');

      const result = await service.login(loginDto);

      expect(result.access_token).toBe('access_token');
      expect(result.refresh_token).toBe('refresh_token');
      expect(result.user).toEqual({ id: '1', email: 'test@test.com' });
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockUserService.findByEmailForAuth.mockResolvedValue(null);

      await expect(service.login({ email: 'test@test.com', password: 'password' })).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('password', expect.stringMatching(/^\$2b\$12\$/));
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects a wrong password using the same generic credential error', async () => {
      mockUserService.findByEmailForAuth.mockResolvedValue({
        id: '1',
        passwordHash: 'stored-hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.login({ email: 'test@test.com', password: 'incorrect' }),
      ).rejects.toThrow('Invalid credentials');
      expect(mockUserService.updateRefreshToken).not.toHaveBeenCalled();
    });
  });
});
