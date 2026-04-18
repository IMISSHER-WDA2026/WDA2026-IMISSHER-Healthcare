import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  DOCTOR = 'doctor',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string; 

  @Column({ unique: true })
  email!: string; 

  @Column()
  fullName!: string; 

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole; 

  @CreateDateColumn()
  createdAt!: Date; 
}