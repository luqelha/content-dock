import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async createMedia(tenantId: string, file: Express.Multer.File) {
    const url = `/uploads/${file.filename}`;

    return this.prisma.media.create({
      data: {
        url,
        type: file.mimetype,
        tenantId,
      },
    });
  }

  async listMedia(tenantId: string) {
    return this.prisma.media.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteMedia(tenantId: string, id: string) {
    const media = await this.prisma.media.findFirst({
      where: { id, tenantId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Try to remove the file
    try {
      const filename = media.url.split('/').pop();
      if (filename) {
        const filePath = join(process.cwd(), 'storage', 'uploads', filename);
        await unlink(filePath);
      }
    } catch (e) {
      console.warn(`Could not delete file for media ${id}:`, e.message);
    }

    // Remove from DB
    await this.prisma.media.delete({
      where: { id },
    });

    return { message: 'Media deleted successfully' };
  }
}
