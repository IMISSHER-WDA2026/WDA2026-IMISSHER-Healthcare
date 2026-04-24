import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FaceRecognitionSource } from '../dto/create-face-recognition.dto';

@Entity('face_recognition_records')
export class FaceRecognition {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Index('face_recognition_user_id_idx')
  @Column({ type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({
    type: 'enum',
    enum: FaceRecognitionSource,
    default: FaceRecognitionSource.UNKNOWN,
  })
  source!: FaceRecognitionSource;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string | null;

  @Column({ type: 'text', nullable: true })
  aiMessage?: string | null;

  @Column({ type: 'int' })
  dimensions!: number;

  @Column({ type: 'jsonb' })
  vector!: number[];

  @Index('face_recognition_matched_user_id_idx')
  @Column({ type: 'uuid', nullable: true })
  matchedUserId?: string | null;

  @Column({ type: 'double precision', nullable: true })
  similarity?: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
