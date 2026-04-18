import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthMetricsService } from './health-metrics.service';
import { CreateHealthMetricDto, HealthMetricType } from './dto/create-health-metric.dto';
import { UpdateHealthMetricDto } from './dto/update-health-metric.dto';

@ApiTags('Health Metrics')
@Controller('health-metrics')
export class HealthMetricsController {
  constructor(private readonly healthMetricsService: HealthMetricsService) { }

  @ApiOperation({ summary: 'Tạo mới một bản ghi chỉ số sức khỏe.' })
  @Post()
  create(@Body() createHealthMetricDto: CreateHealthMetricDto) {
    return this.healthMetricsService.create(createHealthMetricDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách chỉ số sức khỏe theo bộ lọc.' })
  @ApiQuery({ name: 'userId', required: false, description: 'UUID người dùng.' })
  @ApiQuery({ name: 'metricType', required: false, enum: HealthMetricType })
  @ApiQuery({ name: 'limit', required: false, description: 'Giới hạn số bản ghi trả về.' })
  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('metricType', new ParseEnumPipe(HealthMetricType, { optional: true }))
    metricType?: HealthMetricType,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;

    return this.healthMetricsService.findAll({
      userId,
      metricType,
      limit: Number.isNaN(parsedLimit) ? undefined : parsedLimit,
    });
  }

  @ApiOperation({ summary: 'Lấy bản tóm tắt chỉ số sức khỏe theo userId.' })
  @ApiParam({ name: 'userId', description: 'UUID người dùng.' })
  @Get('summary/:userId')
  getSummary(@Param('userId') userId: string) {
    return this.healthMetricsService.getSummaryByUser(userId);
  }

  @ApiOperation({ summary: 'Lấy chi tiết chỉ số sức khỏe theo id.' })
  @ApiParam({ name: 'id', description: 'ID số nguyên của bản ghi.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bản ghi chỉ số.' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.healthMetricsService.findOne(id);
  }

  @ApiOperation({ summary: 'Cập nhật một bản ghi chỉ số sức khỏe.' })
  @ApiParam({ name: 'id', description: 'ID số nguyên của bản ghi.' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHealthMetricDto: UpdateHealthMetricDto,
  ) {
    return this.healthMetricsService.update(id, updateHealthMetricDto);
  }

  @ApiOperation({ summary: 'Xóa một bản ghi chỉ số sức khỏe.' })
  @ApiParam({ name: 'id', description: 'ID số nguyên của bản ghi.' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.healthMetricsService.remove(id);
  }
}
