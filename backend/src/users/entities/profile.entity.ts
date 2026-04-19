import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('profiles')
export class Profile {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  full_name!: string;

  @Column({ type: 'text', nullable: true })
  phone_number!: string | null;

  @Column({ type: 'text', nullable: true })
  avatar_url!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'text', nullable: true })
  fcm_token!: string | null;
}
