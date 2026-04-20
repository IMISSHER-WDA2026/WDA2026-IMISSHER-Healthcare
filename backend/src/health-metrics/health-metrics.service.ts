import { Injectable, NotFoundException } from '@nestjs/common';
import { JsonPersistenceStore } from '../common/persistence/json-persistence.store';
import {
  CreateHealthMetricDto,
  HealthMetricSource,
  HealthMetricType,
} from './dto/create-health-metric.dto';
import { UpdateHealthMetricDto } from './dto/update-health-metric.dto';

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
  private readonly records = new Map<number, HealthMetricRecord>();
  private nextMetricId: number;
  private readonly store = new JsonPersistenceStore<HealthMetricRecord>(
    'health-metrics-records.json',
  );

  constructor() {
    const persistedRecords = this.store.load();
    for (const record of persistedRecords) {
      this.records.set(record.id, record);
    }

    this.nextMetricId = this.store.nextId(persistedRecords);
  }

  create(createHealthMetricDto: CreateHealthMetricDto): HealthMetricRecord {
    const now = new Date().toISOString();
    const record: HealthMetricRecord = {
      id: this.nextMetricId,
      userId: createHealthMetricDto.userId,
      metricType: createHealthMetricDto.metricType,
      value: createHealthMetricDto.value,
      unit:
        createHealthMetricDto.unit?.trim() || this.getDefaultUnit(createHealthMetricDto.metricType),
      measuredAt: createHealthMetricDto.measuredAt ?? now,
      source: createHealthMetricDto.source ?? HealthMetricSource.MANUAL,
      note: createHealthMetricDto.note,
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(record.id, record);
    this.nextMetricId += 1;
    this.persist();
    return record;
  }

  findAll(filters: MetricFilters = {}): HealthMetricRecord[] {
    const filtered = Array.from(this.records.values())
      .filter((record) => {
        if (filters.userId && record.userId !== filters.userId) {
          return false;
        }

        if (filters.metricType && record.metricType !== filters.metricType) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));

    if (filters.limit && filters.limit > 0) {
      return filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  findOne(id: number): HealthMetricRecord {
    const record = this.records.get(id);
    if (!record) {
      throw new NotFoundException(`Health metric #${id} not found.`);
    }

    return record;
  }

  update(id: number, updateHealthMetricDto: UpdateHealthMetricDto): HealthMetricRecord {
    const existing = this.findOne(id);
    const nextMetricType = updateHealthMetricDto.metricType ?? existing.metricType;

    const updated: HealthMetricRecord = {
      ...existing,
      ...updateHealthMetricDto,
      metricType: nextMetricType,
      unit:
        updateHealthMetricDto.unit?.trim() ||
        (updateHealthMetricDto.metricType
          ? this.getDefaultUnit(updateHealthMetricDto.metricType)
          : existing.unit),
      measuredAt: updateHealthMetricDto.measuredAt ?? existing.measuredAt,
      source: updateHealthMetricDto.source ?? existing.source,
      updatedAt: new Date().toISOString(),
    };

    this.records.set(id, updated);
    this.persist();
    return updated;
  }

  remove(id: number): { deleted: true } {
    this.findOne(id);
    this.records.delete(id);
    this.persist();
    return { deleted: true };
  }

  getSummaryByUser(userId: string): {
    userId: string;
    totalRecords: number;
    latestByType: Partial<Record<HealthMetricType, HealthMetricRecord>>;
    latestMeasuredAt: string | null;
  } {
    const records = this.findAll({ userId });
    const latestByType: Partial<Record<HealthMetricType, HealthMetricRecord>> = {};

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

  private persist() {
    this.store.save(Array.from(this.records.values()));
  }
}
