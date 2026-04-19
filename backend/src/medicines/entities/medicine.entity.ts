import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('custom_medicines')
export class Medicine {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column({ type: 'varchar', length: 16, default: 'custom' })
    source!: 'custom';

    @Column({ type: 'varchar', length: 120 })
    name!: string;

    @Column({ type: 'varchar', length: 120, nullable: true })
    active_ingredient?: string | null;

    @Index('custom_medicines_barcode_idx', { unique: true })
    @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
    barcode?: string | null;

    @Column({ type: 'text', nullable: true })
    description?: string | null;

    @Column({ type: 'text', nullable: true })
    contraindications?: string | null;

    @Index('custom_medicines_owner_id_idx')
    @Column({ type: 'uuid', nullable: true })
    ownerId?: string | null;

    @Column({ type: 'int', nullable: true })
    quantity?: number | null;

    @Column({ type: 'varchar', length: 32, nullable: true })
    unit?: string | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    expiresAt?: string | null;

    @Column({ type: 'varchar', length: 16, nullable: true })
    reminderTime?: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
