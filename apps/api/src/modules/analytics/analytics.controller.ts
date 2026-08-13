import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Returns statistics for the dashboard.' })
  getDashboardStats(@Request() req: any) {
    const tenantId = req.tenant.id;
    return this.analyticsService.getDashboardStats(tenantId);
  }
}
