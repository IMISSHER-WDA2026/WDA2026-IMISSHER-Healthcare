import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('sos_profiles')
export class SosProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User)
  @JoinColumn()
  user!: User;

  @Column({ nullable: true })
  bloodType!: string;

  @Column('text', { array: true, default: [] })
  allergies!: string[];

  @Column({ type: 'vector', length: 512, nullable: true })
  faceVector!: string;
}