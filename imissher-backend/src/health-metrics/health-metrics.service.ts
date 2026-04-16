import { Injectable } from '@nestjs/common';
import { CreateHealthMetricDto } from './dto/create-health-metric.dto';
import { UpdateHealthMetricDto } from './dto/update-health-metric.dto';

@Injectable()
export class HealthMetricsService {
  create(createHealthMetricDto: CreateHealthMetricDto) {
    return 'This action adds a new healthMetric';
  }

  findAll() {
    return `This action returns all healthMetrics`;
  }

  findOne(id: number) {
    return `This action returns a #${id} healthMetric`;
  }

  update(id: number, updateHealthMetricDto: UpdateHealthMetricDto) {
    return `This action updates a #${id} healthMetric`;
  }

  remove(id: number) {
    return `This action removes a #${id} healthMetric`;
  }
}
