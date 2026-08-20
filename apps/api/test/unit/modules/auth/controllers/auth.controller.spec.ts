import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../../../src/modules/auth/controllers/auth.controller';
import { AuthService } from '../../../../../src/modules/auth/services/auth.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  refreshTokens: jest.fn(),
  getProfile: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const expectedResult = { id: '1', email: 'test@example.com' };
      mockAuthService.register.mockResolvedValueOnce(expectedResult);

      const result = await controller.register(dto);
      expect(result).toEqual(expectedResult);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should login a user and return tokens', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const expectedResult = { accessToken: 'access', refreshToken: 'refresh' };
      mockAuthService.login.mockResolvedValueOnce(expectedResult);

      const result = await controller.login(dto);
      expect(result).toEqual(expectedResult);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('getProfile', () => {
    it('should return current user profile from req.user', async () => {
      const req = { user: { userId: '1', email: 'test@example.com' } };
      const expectedUser = { id: '1', email: 'test@example.com' };
      mockAuthService.getProfile.mockResolvedValueOnce(expectedUser);

      const result = await controller.getProfile(req);
      expect(result).toEqual(expectedUser);
      expect(mockAuthService.getProfile).toHaveBeenCalledWith('1');
    });
  });

  describe('logout', () => {
    it('should logout a user', async () => {
      const req = { user: { userId: '1' } };
      mockAuthService.logout.mockResolvedValueOnce({ message: 'Logged out' });

      const result = await controller.logout(req);
      expect(result).toEqual({ message: 'Logged out' });
      expect(mockAuthService.logout).toHaveBeenCalledWith('1');
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      const req = { user: { sub: '1', refreshToken: 'old-refresh' } };
      const expectedResult = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      mockAuthService.refreshTokens.mockResolvedValueOnce(expectedResult);

      const result = await controller.refresh(req);
      expect(result).toEqual(expectedResult);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('1', 'old-refresh');
    });
  });
});
