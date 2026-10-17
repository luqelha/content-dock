import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { DatabaseModule } from '../../database/database.module';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MembershipController, TenantController],
  providers: [TenantService, MembershipService],
  exports: [TenantService],
})
export class TenantModule {}
