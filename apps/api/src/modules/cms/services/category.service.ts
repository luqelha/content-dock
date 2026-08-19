import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { Category } from '@prisma/client';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createCategoryDto: CreateCategoryDto): Promise<Category> {
    const existing = await this.prisma.category.findUnique({
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
      const parent = await this.prisma.category.findUnique({
        where: { id: createCategoryDto.parentId },
      });
      if (!parent || parent.tenantId !== tenantId) {
        throw new NotFoundException('Parent category not found or belongs to another tenant.');
      }
    }

    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
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
    await this.findOne(id, tenantId); // ensure it exists and belongs to tenant

    if (updateCategoryDto.slug) {
      const existing = await this.prisma.category.findUnique({
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
      if (updateCategoryDto.parentId === id) {
        throw new ConflictException('A category cannot be its own parent.');
      }
      const parent = await this.prisma.category.findUnique({
        where: { id: updateCategoryDto.parentId },
      });
      if (!parent || parent.tenantId !== tenantId) {
        throw new NotFoundException('Parent category not found or belongs to another tenant.');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: string, tenantId: string): Promise<Category> {
    await this.findOne(id, tenantId); // ensure it exists and belongs to tenant

    // Unlink any contents referencing this category
    await this.prisma.content.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    // Unlink any child categories referencing this category
    await this.prisma.category.updateMany({
      where: { parentId: id },
      data: { parentId: null },
    });

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
