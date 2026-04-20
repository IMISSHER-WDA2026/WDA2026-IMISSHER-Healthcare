import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('sos_incidents')
export class SosRecord {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Index('sos_user_id_idx')
    @Column({ type: 'varchar', length: 64 })
    userId!: string;

    @Column({ type: 'varchar', length: 32 })
    triggerSource!: string;

    @Index('sos_status_idx')
    @Column({ type: 'varchar', length: 32, default: 'open' })
    status!: string;

    @Column({ type: 'double precision', nullable: true })
    latitude?: number | null;

    @Column({ type: 'double precision', nullable: true })
    longitude?: number | null;

    @Column({ type: 'text', nullable: true })
    note?: string | null;

    @Column({ type: 'varchar', length: 32, nullable: true })
    responderPhone?: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    resolvedAt?: Date | null;

    @Column({ type: 'text', nullable: true })
    resolutionNote?: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
