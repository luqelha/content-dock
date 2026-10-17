import type { Tenant } from '@prisma/client';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Permission } from '../../common/enums/permission.enum';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiHeader } from '@nestjs/swagger';

@ApiTags('audit')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant ID is required for role-based access control',
})
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions(Permission.READ_AUDIT_LOGS)
  @ApiOperation({ summary: 'Get audit logs for the current tenant' })
  @ApiResponse({ status: 200, description: 'List of audit logs.' })
  async getAuditLogs(@CurrentTenant() tenant: Pick<Tenant, 'id'>, @Query() query: GetAuditLogsDto) {
    // If tenant context exists, filter by it. If this is a global action, handle appropriately.
    // For this boilerplate, we assume tenant-based filtering if tenant exists.
    const tenantId = tenant?.id;
    return this.auditService.getAuditLogs(tenantId, query);
  }
}
