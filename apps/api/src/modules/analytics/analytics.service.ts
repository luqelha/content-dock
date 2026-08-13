import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(tenantId: string) {
    // Total content count
    const totalContent = await this.prisma.content.count({
      where: { tenantId },
    });

    // Active users count (TenantUsers)
    const activeUsers = await this.prisma.tenantUser.count({
      where: { tenantId },
    });

    // Content by category (for charts if needed)
    const categories = await this.prisma.category.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { contents: true },
        },
      },
    });

    return {
      totalContent,
      activeUsers,
      categoriesCount: categories.length,
      storageUsed: "48.2 GB", // Mocked for now, as file sizes aren't fully tracked or require s3 integration
      contentGrowth: "+24%", // Mocked for now
    };
  }
}
