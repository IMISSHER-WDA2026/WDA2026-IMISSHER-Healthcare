import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateHealthMetricDto,
  HealthMetricSource,
  HealthMetricType,
} from './dto/create-health-metric.dto';
import { UpdateHealthMetricDto } from './dto/update-health-metric.dto';
import { HealthMetric } from './entities/health-metric.entity';

export interface HealthMetricRecord {
  id: number;
  userId: string;
  metricType: HealthMetricType;
  value: number;
  unit: string;
  measuredAt: string;
  source: HealthMetricSource;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

interface MetricFilters {
  userId?: string;
  metricType?: HealthMetricType;
  limit?: number;
}

@Injectable()
export class HealthMetricsService {
  constructor(
    @InjectRepository(HealthMetric)
    private readonly metricsRepository: Repository<HealthMetric>,
  ) {}

  async create(
    createHealthMetricDto: CreateHealthMetricDto,
  ): Promise<HealthMetricRecord> {
    const now = new Date();
    const record = this.metricsRepository.create({
      userId: createHealthMetricDto.userId,
      metricType: createHealthMetricDto.metricType,
      value: createHealthMetricDto.value,
      unit:
        createHealthMetricDto.unit?.trim() ||
        this.getDefaultUnit(createHealthMetricDto.metricType),
      measuredAt: createHealthMetricDto.measuredAt
        ? new Date(createHealthMetricDto.measuredAt)
        : now,
      source: createHealthMetricDto.source ?? HealthMetricSource.MANUAL,
      note: createHealthMetricDto.note?.trim() || null,
    });

    const savedRecord = await this.metricsRepository.save(record);
    return this.toRecord(savedRecord);
  }

  async findAll(filters: MetricFilters = {}): Promise<HealthMetricRecord[]> {
    const query = this.metricsRepository.createQueryBuilder('metric');

    if (filters.userId) {
      query.andWhere('metric.userId = :userId', { userId: filters.userId });
    }

    if (filters.metricType) {
      query.andWhere('metric.metricType = :metricType', {
        metricType: filters.metricType,
      });
    }

    query.orderBy('metric.measuredAt', 'DESC');

    if (filters.limit && filters.limit > 0) {
      query.take(filters.limit);
    }

    const records = await query.getMany();
    return records.map((record) => this.toRecord(record));
  }

  async findOne(id: number): Promise<HealthMetricRecord> {
    const record = await this.metricsRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Health metric #${id} not found.`);
    }

    return this.toRecord(record);
  }

  async update(
    id: number,
    updateHealthMetricDto: UpdateHealthMetricDto,
  ): Promise<HealthMetricRecord> {
    const existing = await this.metricsRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Health metric #${id} not found.`);
    }

    const nextMetricType =
      updateHealthMetricDto.metricType ?? existing.metricType;

    existing.userId = updateHealthMetricDto.userId ?? existing.userId;
    existing.metricType = nextMetricType;
    existing.value = updateHealthMetricDto.value ?? existing.value;
    existing.unit =
      updateHealthMetricDto.unit !== undefined
        ? updateHealthMetricDto.unit.trim() ||
          this.getDefaultUnit(nextMetricType)
        : updateHealthMetricDto.metricType
          ? this.getDefaultUnit(nextMetricType)
          : existing.unit;
    existing.measuredAt = updateHealthMetricDto.measuredAt
      ? new Date(updateHealthMetricDto.measuredAt)
      : existing.measuredAt;
    existing.source = updateHealthMetricDto.source ?? existing.source;

    if (updateHealthMetricDto.note !== undefined) {
      existing.note = updateHealthMetricDto.note.trim() || null;
    }

    const savedRecord = await this.metricsRepository.save(existing);
    return this.toRecord(savedRecord);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    await this.findOne(id);
    await this.metricsRepository.delete({ id });
    return { deleted: true };
  }

  async getSummaryByUser(userId: string): Promise<{
    userId: string;
    totalRecords: number;
    latestByType: Partial<Record<HealthMetricType, HealthMetricRecord>>;
    latestMeasuredAt: string | null;
  }> {
    const records = await this.findAll({ userId });
    const latestByType: Partial<Record<HealthMetricType, HealthMetricRecord>> =
      {};

    for (const record of records) {
      if (!latestByType[record.metricType]) {
        latestByType[record.metricType] = record;
      }
    }

    return {
      userId,
      totalRecords: records.length,
      latestByType,
      latestMeasuredAt: records[0]?.measuredAt ?? null,
    };
  }

  private toRecord(record: HealthMetric): HealthMetricRecord {
    return {
      id: record.id,
      userId: record.userId,
      metricType: record.metricType,
      value: Number(record.value),
      unit: record.unit,
      measuredAt: record.measuredAt.toISOString(),
      source: record.source,
      note: record.note ?? undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private getDefaultUnit(metricType: HealthMetricType): string {
    switch (metricType) {
      case HealthMetricType.HEART_RATE:
        return 'bpm';
      case HealthMetricType.SPO2:
        return '%';
      case HealthMetricType.BLOOD_PRESSURE_SYS:
      case HealthMetricType.BLOOD_PRESSURE_DIA:
        return 'mmHg';
      case HealthMetricType.TEMPERATURE:
        return 'C';
      case HealthMetricType.GLUCOSE:
        return 'mg/dL';
      case HealthMetricType.WEIGHT:
        return 'kg';
      case HealthMetricType.HEIGHT:
        return 'cm';
      default:
        return '';
    }
  }
}
