import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  DOCTOR = 'doctor',
}

export interface EmergencyContact {
  name: string;
  phone: string;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('users_email_idx', { unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 120 })
  fullName!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  bloodType?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  allergies?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  chronicConditions?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  emergencyContactName?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  emergencyContactPhone?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  emergencyContacts?: EmergencyContact[] | null;

  @Column({ type: 'varchar', length: 128 })
  passwordHash!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}