import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTenantDto: CreateTenantDto, userId: string) {
    if (createTenantDto.domain) {
      const existing = await this.prisma.tenant.findUnique({
        where: { domain: createTenantDto.domain },
      });
      if (existing) {
        throw new ConflictException('Domain already in use');
      }
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: createTenantDto.name,
        domain: createTenantDto.domain,
        users: {
          create: {
            userId,
            role: 'ADMIN',
          },
        },
      },
    });

    return tenant;
  }

  async findAllForUser(userId: string) {
    const tenants = await this.prisma.tenant.findMany({
      where: {
        users: {
          some: {
            userId,
          },
        },
      },
      include: {
        users: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    return tenants.map((t) => ({
      ...t,
      role: t.users[0]?.role,
      users: undefined,
    }));
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    await this.findOne(id);

    if (updateTenantDto.domain) {
      const existing = await this.prisma.tenant.findUnique({
        where: { domain: updateTenantDto.domain },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Domain already in use');
      }
    }

    return this.prisma.tenant.update({
      where: { id },
      data: updateTenantDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.tenant.delete({
      where: { id },
    });

    return { message: `Tenant with ID ${id} deleted successfully` };
  }
}
