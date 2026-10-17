import type { Tenant } from '@prisma/client';
import type { AuthenticatedRequest } from '../../../common/types/http-request';
import { ContentSummaryEntity, ContentFullEntity } from '../entities/content-list.entity';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { ContentService } from '../services/content.service';
import { CreateContentDto } from '../dto/create-content.dto';
import { UpdateContentDto } from '../dto/update-content.dto';
import { QueryContentDto } from '../dto/query-content.dto';
import { ContentEntity } from '../entities/content.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/enums/permission.enum';
import { CacheInterceptor } from '../../../common/interceptors/cache.interceptor';

@ApiExtraModels(ContentSummaryEntity, ContentFullEntity, PageMetaDto)
@ApiTags('contents')
@Controller('contents')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(CacheInterceptor)
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant ID is required for role-based access control and data isolation',
})
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @Permissions(Permission.CREATE_CONTENT)
  @ApiOperation({ summary: 'Create new content' })
  @ApiResponse({
    status: 201,
    description: 'The content has been successfully created.',
    type: ContentEntity,
  })
  create(
    @CurrentTenant() tenant: Pick<Tenant, 'id'>,
    @Request() req: AuthenticatedRequest,
    @Body() createContentDto: CreateContentDto,
  ) {
    return this.contentService.create(tenant.id, req.user.userId, createContentDto);
  }

  @Get()
  @Permissions(Permission.READ_CONTENT)
  @ApiOperation({ summary: 'Get all contents for the current tenant' })
  @ApiResponse({
    status: 200,
    description: 'Paginated contents. summary=true omits body; default/false includes body.',
    schema: {
      type: 'object',
      required: ['data', 'meta'],
      properties: {
        data: {
          type: 'array',
          items: {
            oneOf: [
              { $ref: getSchemaPath(ContentFullEntity) },
              {
                allOf: [
                  { $ref: getSchemaPath(ContentSummaryEntity) },
                  { not: { required: ['body'] } },
                ],
              },
            ],
          },
        },
        meta: { $ref: getSchemaPath(PageMetaDto) },
      },
    },
  })
  findAll(@CurrentTenant() tenant: Pick<Tenant, 'id'>, @Query() queryContentDto: QueryContentDto) {
    return this.contentService.findAll(tenant.id, queryContentDto);
  }

  @Get(':id')
  @Permissions(Permission.READ_CONTENT)
  @ApiOperation({ summary: 'Get content by ID' })
  @ApiResponse({ status: 200, description: 'Return a content.', type: ContentEntity })
  findOne(@CurrentTenant() tenant: Pick<Tenant, 'id'>, @Param('id') id: string) {
    return this.contentService.findOne(id, tenant.id);
  }

  @Patch(':id')
  @Permissions(Permission.UPDATE_CONTENT)
  @ApiOperation({ summary: 'Update a content' })
  @ApiResponse({
    status: 200,
    description: 'The content has been successfully updated.',
    type: ContentEntity,
  })
  update(
    @CurrentTenant() tenant: Pick<Tenant, 'id'>,
    @Param('id') id: string,
    @Body() updateContentDto: UpdateContentDto,
  ) {
    return this.contentService.update(id, tenant.id, updateContentDto);
  }

  @Delete(':id')
  @Permissions(Permission.DELETE_CONTENT)
  @ApiOperation({ summary: 'Delete a content' })
  @ApiResponse({
    status: 200,
    description: 'The content has been successfully deleted.',
    type: ContentEntity,
  })
  remove(@CurrentTenant() tenant: Pick<Tenant, 'id'>, @Param('id') id: string) {
    return this.contentService.remove(id, tenant.id);
  }
}
