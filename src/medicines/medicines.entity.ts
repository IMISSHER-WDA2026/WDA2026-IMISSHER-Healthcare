import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_medicines')
export class UserMedicine {
  @ApiProperty({ example: '9b2a1d59-2f4a-4e5c-a8e2-1b2c3d4e5f67' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: '1a7d2f2c-7fb4-4d6d-b66a-8e5d5a1f9b20' })
  @Column()
  user_id!: string;

  @ApiProperty({ example: '3856e0d2-9694-471a-8531-2c3c4d5e6f70' })
  @Column()
  medicine_id!: string;

  @ApiProperty({ example: 10, default: 1 })
  @Column({ default: 1 })
  quantity!: number;

  @ApiPropertyOptional({ example: '2026-12-30', nullable: true })
  @Column({ type: 'date', nullable: true })
  expiry_date!: string | null;

  @ApiPropertyOptional({ example: 'Uống sau khi ăn sáng', nullable: true })
  @Column({ nullable: true })
  custom_note!: string | null;

  @ApiProperty({ example: '2026-04-16T12:00:00.000Z' })
  @CreateDateColumn()
  added_at!: Date;
}