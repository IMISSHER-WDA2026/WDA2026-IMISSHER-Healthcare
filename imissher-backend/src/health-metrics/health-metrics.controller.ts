import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HealthMetricsService } from './health-metrics.service';
import { CreateHealthMetricDto } from './dto/create-health-metric.dto';
import { UpdateHealthMetricDto } from './dto/update-health-metric.dto';

@Controller('health-metrics')
export class HealthMetricsController {
  constructor(private readonly healthMetricsService: HealthMetricsService) {}

  @Post()
  create(@Body() createHealthMetricDto: CreateHealthMetricDto) {
    return this.healthMetricsService.create(createHealthMetricDto);
  }

  @Get()
  findAll() {
    return this.healthMetricsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.healthMetricsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHealthMetricDto: UpdateHealthMetricDto) {
    return this.healthMetricsService.update(+id, updateHealthMetricDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.healthMetricsService.remove(+id);
  }
}
