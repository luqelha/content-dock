import { Module } from '@nestjs/common';
import { TelemetryModule } from './telemetry.module';
import { OperationalHealthService } from './operational-health.service';
@Module({
  imports: [TelemetryModule],
  providers: [OperationalHealthService],
  exports: [OperationalHealthService],
})
export class ObservabilityModule {}
