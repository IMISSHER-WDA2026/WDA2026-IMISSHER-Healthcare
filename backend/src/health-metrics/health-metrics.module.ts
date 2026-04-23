import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthMetricsService } from './health-metrics.service';
import { HealthMetricsController } from './health-metrics.controller';
import { HealthMetric } from './entities/health-metric.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HealthMetric])],
  controllers: [HealthMetricsController],
  providers: [HealthMetricsService],
})
export class HealthMetricsModule { }
