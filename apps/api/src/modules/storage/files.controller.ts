import { Controller, Get, Param, Request, Res, UseGuards, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';
import { FileVaultService } from './file-vault.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('media-files')
@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(
    private prisma: PrismaService,
    private vault: FileVaultService,
  ) {}
  @Get(':filename')
  async read(@Param('filename') filename: string, @Request() req, @Res() res: Response) {
    const url = `/uploads/${filename}`;
    const owner =
      filename.startsWith(`avatar-${req.user.userId}-`) &&
      (await this.prisma.user.findFirst({ where: { id: req.user.userId, avatarUrl: url } }));
    let type: string;
    if (owner)
      type = filename.endsWith('.png')
        ? 'image/png'
        : filename.endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg';
    else {
      const media = await this.prisma.media.findFirst({
        where: {
          url,
          tenantId: req.tenant?.id || '__none__',
          tenant: { users: { some: { userId: req.user.userId } } },
        },
      });
      if (!media) throw new NotFoundException('File not found.');
      type = media.type;
    }
    const data = await this.vault.read(filename);
    res.set({
      'Content-Type': type,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    return res.send(data);
  }
}
