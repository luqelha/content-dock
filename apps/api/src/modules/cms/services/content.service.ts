import {
  contentSummarySelect,
  ContentSummary,
  ContentFull,
} from '../entities/content-list.contract';
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateContentDto } from '../dto/create-content.dto';
import { UpdateContentDto } from '../dto/update-content.dto';
import { Content, ContentStatus, Prisma } from '@prisma/client';
import { QueryContentDto } from '../dto/query-content.dto';
import { PageDto } from '../../../common/dto/page.dto';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  async create(
    tenantId: string,
    authorId: string,
    createContentDto: CreateContentDto,
  ): Promise<Content> {
    const slug = createContentDto.slug || this.generateSlug(createContentDto.title);

    const existing = await this.prisma.client.content.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Content with slug '${slug}' already exists in this tenant.`);
    }

    if (createContentDto.categoryId) {
      const category = await this.prisma.client.category.findUnique({
        where: { id: createContentDto.categoryId },
      });
      if (!category || category.tenantId !== tenantId) {
        throw new NotFoundException('Category not found or belongs to another tenant.');
      }
    }

    const isPublished = createContentDto.status === ContentStatus.PUBLISHED;

    return this.prisma.client.content.create({
      data: {
        ...createContentDto,
        slug,
        tenantId,
        authorId,
        publishedAt: isPublished ? new Date() : null,
      },
    });
  }

  findAll(
    tenantId: string,
    query: QueryContentDto & { summary: 'true' },
  ): Promise<PageDto<ContentSummary>>;
  findAll(
    tenantId: string,
    query: QueryContentDto & { summary?: 'false' },
  ): Promise<PageDto<ContentFull>>;
  findAll(tenantId: string, query: QueryContentDto): Promise<PageDto<ContentSummary | ContentFull>>;
  async findAll(
    tenantId: string,
    queryContentDto: QueryContentDto,
  ): Promise<PageDto<ContentSummary | ContentFull>> {
    const { search, status, categoryId, authorId, take, order, skip } = queryContentDto;

    const where: Prisma.ContentWhereInput = {
      tenantId,
      ...(status && { status }),
      ...(categoryId && { categoryId }),
      ...(authorId && { authorId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { body: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const itemCount = await this.prisma.client.content.count({ where });

    const args = {
      where,
      orderBy: { createdAt: order ? (order.toLowerCase() as Prisma.SortOrder) : 'desc' },
      skip,
      take,
    };
    // Separate projections keep the inferred Prisma result honest: summaries have no body.
    const data =
      queryContentDto.summary === 'true'
        ? await this.prisma.client.content.findMany({ ...args, select: contentSummarySelect })
        : await this.prisma.client.content.findMany({
            ...args,
            select: { ...contentSummarySelect, body: true },
          });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: queryContentDto });

    return new PageDto(data, pageMetaDto);
  }

  async findOne(id: string, tenantId: string): Promise<Content> {
    const content = await this.prisma.client.content.findUnique({
      where: { id },
    });

    if (!content || content.tenantId !== tenantId) {
      throw new NotFoundException(`Content #${id} not found`);
    }

    return content;
  }

  async update(id: string, tenantId: string, updateContentDto: UpdateContentDto): Promise<Content> {
    const content = await this.findOne(id, tenantId); // ensure it exists and belongs to tenant

    let newSlug = updateContentDto.slug;
    if (updateContentDto.title && !updateContentDto.slug) {
      newSlug = this.generateSlug(updateContentDto.title);
    }

    if (newSlug) {
      const existing = await this.prisma.client.content.findUnique({
        where: {
          tenantId_slug: {
            tenantId,
            slug: newSlug,
          },
        },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Content with slug '${newSlug}' already exists in this tenant.`,
        );
      }
    }

    if (updateContentDto.categoryId) {
      const category = await this.prisma.client.category.findUnique({
        where: { id: updateContentDto.categoryId },
      });
      if (!category || category.tenantId !== tenantId) {
        throw new NotFoundException('Category not found or belongs to another tenant.');
      }
    }

    let publishedAt = content.publishedAt;
    if (updateContentDto.status) {
      if (
        updateContentDto.status === ContentStatus.PUBLISHED &&
        content.status !== ContentStatus.PUBLISHED
      ) {
        publishedAt = new Date();
      } else if (updateContentDto.status === ContentStatus.DRAFT) {
        publishedAt = null;
      }
    }

    return this.prisma.client.content.update({
      where: { id },
      data: {
        ...updateContentDto,
        ...(newSlug && { slug: newSlug }),
        publishedAt,
      },
    });
  }

  async remove(id: string, tenantId: string): Promise<Content> {
    await this.findOne(id, tenantId); // ensure it exists and belongs to tenant

    return this.prisma.client.content.delete({
      where: { id },
    });
  }
}
