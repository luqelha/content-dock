import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}
  async getDashboardStats(tenantId: string) {
    const where = { tenantId };
    const [totalContent, activeUsers, categoriesCount, mediaCount, published, recentContent] =
      await Promise.all([
        this.prisma.content.count({ where }),
        this.prisma.tenantUser.count({ where }),
        this.prisma.category.count({ where }),
        this.prisma.media.count({ where }),
        this.prisma.content.count({ where: { ...where, status: 'PUBLISHED' } }),
        this.prisma.content.findMany({
          where,
          take: 8,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            updatedAt: true,
            category: { select: { name: true } },
            author: { select: { email: true, firstName: true, lastName: true } },
          },
        }),
      ]);
    return {
      totalContent,
      activeUsers,
      categoriesCount,
      mediaCount,
      published,
      drafts: totalContent - published,
      recentContent,
    };
  }
}
