import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('medicines')
export class Medicine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User)
  user!: User;

  @Column()
  name!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'date' })
  expiryDate!: Date;

  @Column({ nullable: true })
  barcode!: string;
}