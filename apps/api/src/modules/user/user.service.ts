import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PASSWORD_HASH_COST } from '../../common/validators/password-policy';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async registerCredentials(dto: CreateUserDto) {
    // Always perform the same expensive hash, including for an existing email.
    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_HASH_COST);
    // Preserve legacy mixed-case addresses without creating a second identity.
    const existing = await this.prisma.client.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) return null;
    // Atomic ON CONFLICT DO NOTHING also handles simultaneous registrations
    // without aborting the surrounding audit transaction.
    const result = await this.prisma.client.user.createMany({
      data: { email: dto.email, passwordHash },
      skipDuplicates: true,
    });
    if (!result.count) return null;
    return this.prisma.client.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
  }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.client.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const salt = await bcrypt.genSalt(PASSWORD_HASH_COST);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const user = await this.prisma.client.user.create({
      data: {
        email: createUserDto.email,
        passwordHash: hashedPassword,
      },
    });

    const { passwordHash, refreshToken, ...result } = user;
    return result;
  }

  async findAll() {
    const users = await this.prisma.client.user.findMany();
    return users.map((user) => {
      const { passwordHash, refreshToken, ...result } = user;
      return result;
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { passwordHash, refreshToken, ...result } = user;
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    const data: any = { ...updateUserDto };
    delete data.currentPassword;
    if (updateUserDto.password) {
      const current = await this.findByIdForAuth(id);
      if (
        !updateUserDto.currentPassword ||
        !(await bcrypt.compare(updateUserDto.currentPassword, current.passwordHash))
      )
        throw new ForbiddenException('Incorrect current password.');
      const salt = await bcrypt.genSalt(PASSWORD_HASH_COST);
      data.passwordHash = await bcrypt.hash(updateUserDto.password, salt);
      data.refreshToken = null; // Invalidate refresh token on password change
      delete data.password;
    }

    if (updateUserDto.email) {
      const existingUser = await this.prisma.client.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    const user = await this.prisma.client.user.update({
      where: { id },
      data,
    });

    const { passwordHash, refreshToken, ...result } = user;
    return result;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.client.user.delete({
      where: { id },
    });

    return { message: `User with ID ${id} deleted successfully` };
  }

  async getProfile(id: string) {
    return this.findOne(id);
  }
  async updateAvatar(id: string, avatarUrl: string) {
    return this.prisma.client.user.update({
      where: { id },
      data: { avatarUrl },
      select: { avatarUrl: true },
    });
  }

  async findByEmailForAuth(email: string) {
    const matches = await this.prisma.client.user.findMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      take: 2,
    });
    // Ambiguous historical case collisions require operator resolution.
    return matches.length === 1 ? matches[0] : null;
  }

  async findByIdForAuth(id: string) {
    return this.prisma.client.user.findUnique({
      where: { id },
    });
  }

  async updateRefreshToken(id: string, refreshToken: string | null) {
    let refreshTokenHash = null;
    if (refreshToken) {
      const salt = await bcrypt.genSalt();
      refreshTokenHash = await bcrypt.hash(
        createHash('sha256').update(refreshToken).digest('hex'),
        salt,
      );
    }
    await this.prisma.client.user.update({
      where: { id },
      data: { refreshToken: refreshTokenHash },
    });
  }

  async rotateRefreshToken(id: string, expectedHash: string, token: string) {
    const hash = await bcrypt.hash(createHash('sha256').update(token).digest('hex'), 10);
    const result = await this.prisma.client.user.updateMany({
      where: { id, refreshToken: expectedHash },
      data: { refreshToken: hash },
    });
    return result.count === 1;
  }
}
