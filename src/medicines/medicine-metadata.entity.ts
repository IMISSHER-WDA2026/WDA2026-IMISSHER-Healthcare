import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('medicines_metadata')
export class MedicineMetadata {
  @ApiProperty({ example: '3856e0d2-9694-471a-8531-2c3c4d5e6f70' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'Panadol Extra' })
  @Column()
  name!: string;

  @ApiPropertyOptional({ example: 'Paracetamol + Caffeine', nullable: true })
  @Column({ nullable: true })
  active_ingredient!: string;

  @ApiPropertyOptional({ example: '8934581234567', nullable: true })
  @Column({ nullable: true, unique: true })
  barcode!: string;

  @ApiPropertyOptional({ example: 'Thuốc giảm đau, hạ sốt', nullable: true })
  @Column({ nullable: true })
  description!: string;

  @ApiPropertyOptional({ example: 'Không dùng cho người dị ứng paracetamol', nullable: true })
  @Column({ nullable: true })
  contraindications!: string;

  @ApiProperty({ example: '2026-04-16T12:00:00.000Z' })
  @CreateDateColumn()
  created_at!: Date;
}