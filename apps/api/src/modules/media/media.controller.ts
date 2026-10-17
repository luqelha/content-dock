import type { Tenant } from '@prisma/client';
import { Query } from '@nestjs/common';
import { ListPageDto } from '../../common/dto/list-page.dto';
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { MediaResponseDto } from './dto/media.dto';

@ApiTags('media')
@Controller('media')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant ID is required',
})
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @Permissions(Permission.MANAGE_MEDIA)
  @ApiOperation({ summary: 'Upload a media file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The media has been successfully uploaded.',
    type: MediaResponseDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @CurrentTenant() tenant: Pick<Tenant, 'id'>,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.mediaService.createMedia(tenant.id, file);
  }

  @Get()
  @Permissions(Permission.READ_MEDIA)
  @ApiOperation({ summary: 'List all media files for current tenant' })
  @ApiResponse({
    status: 200,
    description: 'List of media files',
    type: [MediaResponseDto],
  })
  findAll(
    @CurrentTenant() tenant: Pick<Tenant, 'id'>,
    @Query() query: ListPageDto = new ListPageDto(),
  ) {
    return this.mediaService.listMedia(tenant.id, query);
  }

  @Delete(':id')
  @Permissions(Permission.MANAGE_MEDIA)
  @ApiOperation({ summary: 'Delete a media file' })
  @ApiResponse({ status: 200, description: 'Media deleted successfully' })
  remove(@CurrentTenant() tenant: Pick<Tenant, 'id'>, @Param('id') id: string) {
    return this.mediaService.deleteMedia(tenant.id, id);
  }
}
