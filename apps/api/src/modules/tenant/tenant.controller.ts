import type { AuthenticatedRequest } from '../../common/types/http-request';
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({ status: 201, description: 'The tenant has been successfully created.' })
  create(@Body() createTenantDto: CreateTenantDto, @Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.tenantService.create(createTenantDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tenants for current user' })
  @ApiResponse({ status: 200, description: 'Return all tenants for the current user.' })
  findAll(@Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.tenantService.findAllForUser(userId);
  }

  @Get(':tenantId')
  @UseGuards(RbacGuard)
  @ApiOperation({ summary: 'Get a tenant by ID' })
  @ApiResponse({ status: 200, description: 'Return a tenant.' })
  findOne(@Param('tenantId') id: string) {
    return this.tenantService.findOne(id);
  }

  @Patch(':tenantId')
  @UseGuards(RbacGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a tenant' })
  @ApiResponse({ status: 200, description: 'The tenant has been successfully updated.' })
  update(@Param('tenantId') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantService.update(id, updateTenantDto);
  }

  @Delete(':tenantId')
  @UseGuards(RbacGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a tenant' })
  @ApiResponse({ status: 200, description: 'The tenant has been successfully deleted.' })
  remove(@Param('tenantId') id: string) {
    return this.tenantService.remove(id);
  }
}
