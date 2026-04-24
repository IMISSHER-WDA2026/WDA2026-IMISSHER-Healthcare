import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UploadCategory } from '../dto/create-upload.dto';

@Entity('uploads')
export class Upload {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Index('uploads_user_id_idx')
  @Column({ type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ type: 'enum', enum: UploadCategory, default: UploadCategory.OTHER })
  category!: UploadCategory;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[] | null;

  @Column({ type: 'varchar', length: 255 })
  originalName!: string;

  @Index('uploads_stored_name_idx', { unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  storedName!: string;

  @Column({ type: 'varchar', length: 128 })
  mimeType!: string;

  @Column({ type: 'int' })
  size!: number;

  @Column({ type: 'text' })
  absolutePath!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
