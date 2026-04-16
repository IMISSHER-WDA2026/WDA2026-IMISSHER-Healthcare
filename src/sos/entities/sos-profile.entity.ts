import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sos_profiles')
export class SosProfile {
  @ApiProperty({ example: '8e7b9b4e-0c2b-4c8f-bcb5-f6d75d8fb0d1' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: '1a7d2f2c-7fb4-4d6d-b66a-8e5d5a1f9b20' })
  @Column({ nullable: true })
  user_id!: string;

  @ApiPropertyOptional({ example: 'O+', nullable: true })
  @Column({ nullable: true })
  blood_type!: string;

  @ApiPropertyOptional({ example: 'Penicillin', nullable: true })
  @Column({ nullable: true })
  allergies!: string;

  @ApiPropertyOptional({ example: 'Tiểu đường type 2', nullable: true })
  @Column({ nullable: true })
  underlying_conditions!: string;

  @ApiPropertyOptional({ example: 'Cần tránh dùng thuốc an thần', nullable: true })
  @Column({ nullable: true })
  medical_notes!: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn B', nullable: true })
  @Column({ nullable: true })
  emergency_contact_name!: string;

  @ApiPropertyOptional({ example: '0901234567', nullable: true })
  @Column({ nullable: true })
  emergency_phone!: string;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at!: Date;
}