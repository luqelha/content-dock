import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  HttpStatus,
  NotFoundException,
  UseGuards,
  Request,
  ParseUUIDPipe,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { ExportService } from './export.service';
import { Response } from 'express';
import { ApiProperty } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { IsDateString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileVaultService } from '../storage/file-vault.service';
import { pipeline } from 'stream/promises';
import { archiveJobId } from './export-filename';

export class ExportLogsDto {
  @ApiProperty({
    example: '2026-07-01',
    description: 'The start date for the log export',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2026-07-24',
    description: 'The end date for the log export',
  })
  @IsDateString()
  endDate: string;
}

@Controller('export')
@ApiTags('exports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles(Role.ADMIN)
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly vault: FileVaultService,
  ) {}

  @Post('logs')
  @HttpCode(HttpStatus.ACCEPTED)
  async exportLogs(@Body() body: ExportLogsDto, @Request() req) {
    const startDate = body?.startDate;
    const endDate = body?.endDate;
    const days = (Date.parse(endDate) - Date.parse(startDate)) / 86400000;
    if (!Number.isFinite(days) || days < 0 || days > 366)
      throw new BadRequestException('Choose a valid date range of up to 366 days.');
    const data = await this.exportService.createJob(
      startDate,
      endDate,
      req.tenant.id,
      req.user.userId,
    );

    return {
      success: true,
      message: 'The export job was accepted.',
      data,
    };
  }

  @Get('status/:jobId')
  async getStatus(@Param('jobId', ParseUUIDPipe) jobId: string, @Request() req) {
    const data = await this.exportService.getJobStatus(jobId, req.tenant.id, req.user.userId);
    return {
      success: true,
      message: 'Job status retrieved successfully.',
      data,
    };
  }

  @Get('download/:jobId')
  async download(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Res() res: Response,
    @Request() req,
  ) {
    const job = await this.exportService.getJobStatus(jobId, req.tenant.id, req.user.userId);
    if (job.status !== 'Completed') throw new NotFoundException('Export is not ready.');
    res.setHeader('Cache-Control', 'private, no-store');
    const exportPath = path.join(process.cwd(), 'storage', 'exports');
    const zipName = `export-${jobId}.zip`;
    const storedName = job.filename ?? zipName;
    if (archiveJobId(storedName) !== jobId) throw new NotFoundException('Export file not found.');
    const filePath = path.join(exportPath, storedName);

    if (!fs.existsSync(filePath + '.enc')) {
      throw new NotFoundException('Export file not found or has expired.');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    await pipeline(this.vault.archiveReader(filePath), res);
  }
}
