import { Query } from '@nestjs/common';
import { ListPageDto } from '../../../common/dto/list-page.dto';
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { CategoryService } from '../services/category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryEntity } from '../entities/category.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/enums/permission.enum';

@ApiTags('categories')
@Controller('categories')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant ID is required for role-based access control and data isolation',
})
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @Permissions(Permission.CREATE_CATEGORY)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: 201,
    description: 'The category has been successfully created.',
    type: CategoryEntity,
  })
  create(@CurrentTenant() tenant: any, @Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(tenant.id, createCategoryDto);
  }

  @Get()
  @Permissions(Permission.READ_CATEGORY)
  @ApiOperation({ summary: 'Get all categories for the current tenant' })
  @ApiResponse({ status: 200, description: 'Return all categories.', type: [CategoryEntity] })
  findAll(@CurrentTenant() tenant: any, @Query() query: ListPageDto = new ListPageDto()) {
    return this.categoryService.findAll(tenant.id, query);
  }

  @Get(':id')
  @Permissions(Permission.READ_CATEGORY)
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiResponse({ status: 200, description: 'Return a category.', type: CategoryEntity })
  findOne(@CurrentTenant() tenant: any, @Param('id') id: string) {
    return this.categoryService.findOne(id, tenant.id);
  }

  @Patch(':id')
  @Permissions(Permission.UPDATE_CATEGORY)
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({
    status: 200,
    description: 'The category has been successfully updated.',
    type: CategoryEntity,
  })
  update(
    @CurrentTenant() tenant: any,
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, tenant.id, updateCategoryDto);
  }

  @Delete(':id')
  @Permissions(Permission.DELETE_CATEGORY)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({
    status: 200,
    description: 'The category has been successfully deleted.',
    type: CategoryEntity,
  })
  remove(@CurrentTenant() tenant: any, @Param('id') id: string) {
    return this.categoryService.remove(id, tenant.id);
  }
}
