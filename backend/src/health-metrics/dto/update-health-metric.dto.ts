import { PartialType } from '@nestjs/swagger';
import { CreateHealthMetricDto } from './create-health-metric.dto';

export class UpdateHealthMetricDto extends PartialType(CreateHealthMetricDto) {}
