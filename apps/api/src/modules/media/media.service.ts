import { uploadFormat } from '../storage/upload-formats';
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { randomUUID } from 'crypto';
import { FileVaultService } from '../storage/file-vault.service';
import { validateUpload } from '../storage/validate-upload';
import { ListPageDto } from '../../common/dto/list-page.dto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: FileVaultService,
  ) {}

  async createMedia(tenantId: string, file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Choose a file to upload.');
    const extension = uploadFormat(file.mimetype)?.extension;
    if (!extension) throw new BadRequestException('Unsupported file type.');
    file.filename = `${randomUUID()}.${extension}`;
    const url = `/uploads/${file.filename}`;
    await this.vault.save(file.filename, await validateUpload(file));
    this.prisma.afterRollback(() => this.vault.remove(file.filename));
    try {
      return await this.prisma.client.media.create({
        data: {
          url,
          type: file.mimetype,
          tenantId,
        },
      });
    } catch (error) {
      await this.vault.remove(file.filename);
      throw error;
    }
  }

  async listMedia(tenantId: string, query = new ListPageDto()) {
    return this.prisma.client.media.findMany({
      where: { tenantId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: query.skip,
      take: query.take,
    });
  }

  async deleteMedia(tenantId: string, id: string) {
    const media = await this.prisma.client.media.findFirst({
      where: { id, tenantId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    await this.prisma.client.media.delete({
      where: { id },
    });
    await this.prisma.afterCommit(async () => {
      const filename = media.url.split('/').pop();
      try {
        if (filename) await this.vault.remove(filename);
      } catch {
        this.logger.warn({ event: 'MEDIA_CLEANUP_DEFERRED', mediaId: id });
      }
    });

    return { message: 'Media deleted successfully' };
  }
}
