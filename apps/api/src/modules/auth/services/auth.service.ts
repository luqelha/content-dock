import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/user.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma.service';

// Fixed, valid cost-12 bcrypt hash; its password is irrelevant. Unknown accounts
// still take a bcrypt comparison, avoiding an early-return timing oracle.
const DUMMY_PASSWORD_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxAazCrHfpihGUk1RUMJR7nJZ1m';
export const REGISTRATION_MESSAGE = 'Registration request received. You can now try signing in.';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.userService.registerCredentials(registerDto);
    // The controller keeps the actor ID for auditing and exposes only message.
    return { message: REGISTRATION_MESSAGE, user };
  }

  async getProfile(userId: string) {
    return this.userService.findOne(userId);
  }

  async validateUser(email: string, pass: string) {
    const user = await this.userService.findByEmailForAuth(email);
    const matches = await bcrypt.compare(pass, user?.passwordHash || DUMMY_PASSWORD_HASH);
    if (user && matches) {
      const { passwordHash, refreshToken, ...result } = user;
      return result;
    }
    return null;
  }

  async getTokens(userId: string, email: string) {
    const payload = { sub: userId, email, jti: randomUUID() };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...payload, token_use: 'access' }),
      this.jwtService.signAsync(
        { ...payload, token_use: 'refresh' },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d') as any,
        },
      ),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.getTokens(user.id, user.email);
    await this.userService.updateRefreshToken(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user,
    };
  }

  async logout(userId: string) {
    await this.userService.updateRefreshToken(userId, null);
    await this.redisService.clearUserRbacCache(userId);
    return { message: 'Logged out successfully' };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const digest = createHash('sha256').update(refreshToken).digest('hex');
    const cacheKey = `refresh-result:${userId}:${digest}`;
    const lockKey = `refresh-lock:${userId}`;
    const lockId = randomUUID();
    const client = this.redisService.getClient();
    for (let attempt = 0; attempt < 50; attempt++) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        const result = JSON.parse(cached);
        const current = await this.userService.findByIdForAuth(userId);
        // Logout or a subsequent login invalidates even the short concurrency grace window.
        if (
          current?.refreshToken &&
          (await bcrypt.compare(
            createHash('sha256').update(result.refresh_token).digest('hex'),
            current.refreshToken,
          ))
        )
          return result;
        throw new ForbiddenException('Access Denied');
      }
      if (await client.set(lockKey, lockId, { NX: true, PX: 30000 })) break;
      if (attempt === 49) throw new ForbiddenException('Session refresh in progress. Retry.');
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const release = async () =>
      client.eval(
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
        { keys: [lockKey], arguments: [lockId] },
      );
    this.prisma.afterRollback(release);
    try {
      const completed = await this.redisService.get(cacheKey);
      if (completed) {
        const result = JSON.parse(completed);
        const current = await this.userService.findByIdForAuth(userId);
        if (
          current?.refreshToken &&
          (await bcrypt.compare(
            createHash('sha256').update(result.refresh_token).digest('hex'),
            current.refreshToken,
          ))
        ) {
          await release();
          return result;
        }
        throw new ForbiddenException('Access Denied');
      }
      const user = await this.userService.findByIdForAuth(userId);
      if (!user || !user.refreshToken) {
        throw new ForbiddenException('Access Denied');
      }

      const refreshTokenMatches = await bcrypt.compare(digest, user.refreshToken);

      if (!refreshTokenMatches) {
        throw new ForbiddenException('Access Denied');
      }

      const tokens = await this.getTokens(user.id, user.email);
      if (
        !(await this.userService.rotateRefreshToken(
          user.id,
          user.refreshToken,
          tokens.refresh_token,
        ))
      ) {
        throw new ForbiddenException('Session changed. Please sign in again.');
      }
      await this.prisma.afterCommit(async () => {
        try {
          await this.redisService.set(cacheKey, JSON.stringify(tokens), { EX: 5 });
        } finally {
          await release();
        }
      });
      return tokens;
    } catch (error) {
      await release();
      throw error;
    }
  }
}
