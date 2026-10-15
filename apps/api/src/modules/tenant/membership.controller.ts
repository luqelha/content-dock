import { Query } from '@nestjs/common';
import { ListPageDto } from '../../common/dto/list-page.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MembershipService } from './membership.service';
import { AcceptInvitationDto, InviteMemberDto, UpdateMemberDto } from './dto/member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { TrackActivity } from '../../common/decorators/track-activity.decorator';

@ApiTags('members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class MembershipController {
  constructor(private members: MembershipService) {}
  @Post('invitations/accept')
  accept(@Request() req, @Body() dto: AcceptInvitationDto) {
    return this.members.accept(req.user.userId, dto.token);
  }
  @Get(':tenantId/members')
  @UseGuards(RbacGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  list(@Param('tenantId') tenantId: string, @Query() query: ListPageDto = new ListPageDto()) {
    return this.members.list(tenantId, query);
  }
  @Post(':tenantId/invitations')
  @UseGuards(RbacGuard)
  @Roles(Role.ADMIN)
  @TrackActivity('INVITE_MEMBER', 'Membership')
  invite(@Param('tenantId') tenantId: string, @Request() req, @Body() dto: InviteMemberDto) {
    return this.members.invite(tenantId, req.user.userId, dto);
  }
  @Patch(':tenantId/members/:userId')
  @UseGuards(RbacGuard)
  @Roles(Role.ADMIN)
  @TrackActivity('UPDATE_MEMBER', 'Membership')
  update(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Request() req,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.members.change(tenantId, req.user.userId, userId, dto.role);
  }
  @Delete(':tenantId/members/:userId')
  @UseGuards(RbacGuard)
  @Roles(Role.ADMIN)
  @TrackActivity('REMOVE_MEMBER', 'Membership')
  remove(@Param('tenantId') tenantId: string, @Param('userId') userId: string, @Request() req) {
    return this.members.change(tenantId, req.user.userId, userId);
  }
}
