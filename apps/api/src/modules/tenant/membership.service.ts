import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { InviteMemberDto } from './dto/member.dto';
import { Role } from '../../common/enums/role.enum';
import { ListPageDto } from '../../common/dto/list-page.dto';

@Injectable()
export class MembershipService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}
  list(tenantId: string, query = new ListPageDto()) {
    return this.prisma.client.tenantUser.findMany({
      where: { tenantId },
      orderBy: { user: { email: 'asc' } },
      skip: query.skip,
      take: query.take,
      select: {
        userId: true,
        role: true,
        user: { select: { email: true, firstName: true, lastName: true, createdAt: true } },
      },
    });
  }
  async invite(tenantId: string, invitedBy: string, dto: InviteMemberDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.client.tenantUser.findFirst({ where: { tenantId, user: { email } } }))
      throw new ConflictException('This email is already a workspace member.');
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    await this.prisma.afterCommit(() =>
      this.redis.set(
        this.key(token),
        JSON.stringify({ tenantId, invitedBy, email, role: dto.role, expiresAt }),
        { EX: 604800 },
      ),
    );
    return { token, email, role: dto.role, expiresAt };
  }
  async accept(userId: string, token: string) {
    const raw = await this.redis.get(this.key(token));
    if (!raw) throw new NotFoundException('Invitation is invalid or has expired.');
    const invite = JSON.parse(raw);
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (user?.email.toLowerCase() !== invite.email)
      throw new ForbiddenException('Sign in with the invited email address.');
    const issuer = await this.prisma.client.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId: invite.tenantId, userId: invite.invitedBy } },
    });
    if (issuer?.role !== Role.ADMIN)
      throw new ForbiddenException('This invitation is no longer valid.');
    await this.prisma.client.tenantUser.upsert({
      where: { tenantId_userId: { tenantId: invite.tenantId, userId } },
      create: { tenantId: invite.tenantId, userId, role: invite.role },
      update: {},
    });
    await this.prisma.afterCommit(() => this.redis.del(this.key(token)));
    return { tenantId: invite.tenantId };
  }
  async change(tenantId: string, actorId: string, userId: string, role?: Role) {
    if (actorId === userId)
      throw new BadRequestException('Ask another administrator to change your access.');
    return this.prisma.inTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Tenant" WHERE id = ${tenantId} FOR UPDATE`;
      const actor = await tx.tenantUser.findUnique({
        where: { tenantId_userId: { tenantId, userId: actorId } },
      });
      if (actor?.role !== Role.ADMIN)
        throw new ForbiddenException('Administrator access required.');
      const target = await tx.tenantUser.findUnique({
        where: { tenantId_userId: { tenantId, userId } },
      });
      if (!target) throw new NotFoundException('Member not found.');
      if (
        target.role === Role.ADMIN &&
        role !== Role.ADMIN &&
        (await tx.tenantUser.count({ where: { tenantId, role: Role.ADMIN } })) <= 1
      )
        throw new ConflictException('A workspace needs at least one administrator.');
      if (role) return tx.tenantUser.update({ where: { id: target.id }, data: { role } });
      await tx.tenantUser.delete({ where: { id: target.id } });
      return { message: 'Member removed from this workspace.' };
    });
  }
  private key(token: string) {
    return `invitation:${createHash('sha256').update(token).digest('hex')}`;
  }
}
