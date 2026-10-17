import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { Category } from '@prisma/client';
import { ListPageDto } from '../../../common/dto/list-page.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createCategoryDto: CreateCategoryDto): Promise<Category> {
    return this.prisma.inTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Tenant" WHERE id = ${tenantId} FOR UPDATE`;
      return this.createInTransaction(tenantId, createCategoryDto);
    });
  }

  private async createInTransaction(
    tenantId: string,
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    const existing = await this.prisma.client.category.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug: createCategoryDto.slug,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Category with slug '${createCategoryDto.slug}' already exists in this tenant.`,
      );
    }

    if (createCategoryDto.parentId) {
      let parentId: string | null = createCategoryDto.parentId;
      const visited = new Set<string>();
      while (parentId) {
        if (visited.has(parentId) || visited.size >= 63)
          throw new ConflictException('Category hierarchy is cyclic or too deep.');
        visited.add(parentId);
        const parent: Category | null = await this.prisma.client.category.findUnique({
          where: { id: parentId },
        });
        if (!parent || parent.tenantId !== tenantId)
          throw new NotFoundException('Parent category not found or belongs to another tenant.');
        parentId = parent.parentId;
      }
    }

    return this.prisma.client.category.create({
      data: {
        ...createCategoryDto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string, query = new ListPageDto()): Promise<Category[]> {
    return this.prisma.client.category.findMany({
      where: {
        tenantId,
        ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: query.skip,
      take: query.take,
    });
  }

  async findOne(id: string, tenantId: string): Promise<Category> {
    const category = await this.prisma.client.category.findUnique({
      where: { id },
    });

    if (!category || category.tenantId !== tenantId) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return category;
  }

  async update(
    id: string,
    tenantId: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.prisma.inTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Tenant" WHERE id = ${tenantId} FOR UPDATE`;
      return this.updateInTransaction(id, tenantId, updateCategoryDto);
    });
  }

  private async updateInTransaction(
    id: string,
    tenantId: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    await this.findOne(id, tenantId); // ensure it exists and belongs to tenant

    if (updateCategoryDto.slug) {
      const existing = await this.prisma.client.category.findUnique({
        where: {
          tenantId_slug: {
            tenantId,
            slug: updateCategoryDto.slug,
          },
        },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Category with slug '${updateCategoryDto.slug}' already exists in this tenant.`,
        );
      }
    }

    if (updateCategoryDto.parentId) {
      const visited = new Set<string>([id]);
      let parentId: string | null = updateCategoryDto.parentId;
      while (parentId) {
        if (visited.has(parentId))
          throw new ConflictException('Category hierarchy cannot contain a cycle.');
        if (visited.size >= 64) throw new ConflictException('Category hierarchy is too deep.');
        visited.add(parentId);
        const parent: Category | null = await this.prisma.client.category.findUnique({
          where: { id: parentId },
        });
        if (!parent || parent.tenantId !== tenantId) {
          throw new NotFoundException('Parent category not found or belongs to another tenant.');
        }
        parentId = parent.parentId;
      }
    }

    return this.prisma.client.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: string, tenantId: string): Promise<Category> {
    return this.prisma.inTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Tenant" WHERE id = ${tenantId} FOR UPDATE`;
      return this.removeInTransaction(id, tenantId);
    });
  }

  private async removeInTransaction(id: string, tenantId: string): Promise<Category> {
    await this.findOne(id, tenantId); // ensure it exists and belongs to tenant

    // Unlink any contents referencing this category
    await this.prisma.client.content.updateMany({
      where: { categoryId: id, tenantId },
      data: { categoryId: null },
    });

    // Unlink any child categories referencing this category
    await this.prisma.client.category.updateMany({
      where: { parentId: id, tenantId },
      data: { parentId: null },
    });

    return this.prisma.client.category.delete({
      where: { id },
    });
  }
}
