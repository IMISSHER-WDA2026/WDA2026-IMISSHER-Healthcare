import { Module } from '@nestjs/common';
import { HealthMetricsService } from './health-metrics.service';
import { HealthMetricsController } from './health-metrics.controller';

@Module({
  controllers: [HealthMetricsController],
  providers: [HealthMetricsService],
})
export class HealthMetricsModule {}
