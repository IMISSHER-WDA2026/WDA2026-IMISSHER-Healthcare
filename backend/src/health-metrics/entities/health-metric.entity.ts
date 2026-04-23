import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { HealthMetricSource, HealthMetricType } from '../dto/create-health-metric.dto';

@Entity('health_metrics')
export class HealthMetric {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Index('health_metrics_user_id_idx')
    @Column({ type: 'uuid' })
    userId!: string;

    @Index('health_metrics_metric_type_idx')
    @Column({ type: 'enum', enum: HealthMetricType })
    metricType!: HealthMetricType;

    @Column({ type: 'double precision' })
    value!: number;

    @Column({ type: 'varchar', length: 16, default: '' })
    unit!: string;

    @Index('health_metrics_measured_at_idx')
    @Column({ type: 'timestamptz' })
    measuredAt!: Date;

    @Column({ type: 'enum', enum: HealthMetricSource, default: HealthMetricSource.MANUAL })
    source!: HealthMetricSource;

    @Column({ type: 'varchar', length: 500, nullable: true })
    note?: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
