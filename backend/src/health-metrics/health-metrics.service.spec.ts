import { HealthMetricsService } from './health-metrics.service';
import {
  HealthMetricSource,
  HealthMetricType,
} from './dto/create-health-metric.dto';

describe('HealthMetricsService', () => {
  let service: HealthMetricsService;

  beforeEach(() => {
    service = new HealthMetricsService();
  });

  it('creates metrics and builds summary from latest values', () => {
    const userId = 'b2608c17-36ca-4bb1-b9e8-f5e83273389a';

    service.create({
      userId,
      metricType: HealthMetricType.HEART_RATE,
      value: 81,
      measuredAt: '2026-04-18T10:00:00.000Z',
      source: HealthMetricSource.DEVICE,
    });

    service.create({
      userId,
      metricType: HealthMetricType.HEART_RATE,
      value: 78,
      measuredAt: '2026-04-18T11:00:00.000Z',
      source: HealthMetricSource.DEVICE,
    });

    service.create({
      userId,
      metricType: HealthMetricType.SPO2,
      value: 98,
      measuredAt: '2026-04-18T11:05:00.000Z',
      source: HealthMetricSource.DEVICE,
    });

    const summary = service.getSummaryByUser(userId);

    expect(summary.totalRecords).toBe(3);
    expect(summary.latestByType.heart_rate?.value).toBe(78);
    expect(summary.latestByType.spo2?.value).toBe(98);
  });

  it('filters metrics by metric type and limit', () => {
    const userId = '0a7435f9-f778-46db-8a96-78e0ec8f7aaf';

    service.create({
      userId,
      metricType: HealthMetricType.TEMPERATURE,
      value: 37.2,
      measuredAt: '2026-04-18T10:00:00.000Z',
    });

    service.create({
      userId,
      metricType: HealthMetricType.TEMPERATURE,
      value: 37,
      measuredAt: '2026-04-18T11:00:00.000Z',
    });

    service.create({
      userId,
      metricType: HealthMetricType.HEART_RATE,
      value: 76,
      measuredAt: '2026-04-18T12:00:00.000Z',
    });

    const filtered = service.findAll({
      userId,
      metricType: HealthMetricType.TEMPERATURE,
      limit: 1,
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0].metricType).toBe(HealthMetricType.TEMPERATURE);
    expect(filtered[0].value).toBe(37);
  });
});
