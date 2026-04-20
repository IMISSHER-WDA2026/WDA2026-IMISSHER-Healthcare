import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { JsonPersistenceStore } from '../common/persistence/json-persistence.store';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UploadCategory } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';

interface UploadedFileInput {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
}

interface NormalizedUploadFile {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  size: number;
}

export interface UploadRecord {
  id: number;
  userId?: string;
  category: UploadCategory;
  note?: string;
  tags?: string[];
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  absolutePath: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResponse extends Omit<UploadRecord, 'absolutePath'> {
  contentUrl: string;
}

@Injectable()
export class UploadsService {
  private readonly records = new Map<number, UploadRecord>();
  private nextUploadId: number;
  private readonly store = new JsonPersistenceStore<UploadRecord>('uploads.json');
  private readonly uploadDirectory = this.resolveUploadDirectory();

  constructor() {
    if (!existsSync(this.uploadDirectory)) {
      mkdirSync(this.uploadDirectory, { recursive: true });
    }

    const persistedRecords = this.store.load();
    for (const record of persistedRecords) {
      this.records.set(record.id, record);
    }

    this.nextUploadId = this.store.nextId(persistedRecords);
  }

  create(
    createUploadDto: CreateUploadDto,
    file?: UploadedFileInput,
  ): UploadResponse {
    const normalizedFile = this.assertAndNormalizeFile(file);
    const extension = this.resolveFileExtension(
      normalizedFile.originalName,
      normalizedFile.mimeType,
    );
    const storedName = `${Date.now()}-${randomUUID()}${extension}`;
    const absolutePath = resolve(this.uploadDirectory, storedName);

    writeFileSync(absolutePath, normalizedFile.buffer);

    const now = new Date().toISOString();
    const record: UploadRecord = {
      id: this.nextUploadId,
      userId: createUploadDto.userId,
      category: createUploadDto.category ?? UploadCategory.OTHER,
      note: createUploadDto.note,
      tags: createUploadDto.tags?.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
      originalName: normalizedFile.originalName,
      storedName,
      mimeType: normalizedFile.mimeType,
      size: normalizedFile.size,
      absolutePath,
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(record.id, record);
    this.nextUploadId += 1;
    this.persist();
    return this.toResponse(record);
  }

  findAll(userId?: string): UploadResponse[] {
    return Array.from(this.records.values())
      .filter((record) => (userId ? record.userId === userId : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((record) => this.toResponse(record));
  }

  findOne(id: number): UploadResponse {
    return this.toResponse(this.findOneRecord(id));
  }

  update(id: number, updateUploadDto: UpdateUploadDto): UploadResponse {
    const existing = this.findOneRecord(id);
    const updated: UploadRecord = {
      ...existing,
      userId: updateUploadDto.userId ?? existing.userId,
      category: updateUploadDto.category ?? existing.category,
      note: updateUploadDto.note ?? existing.note,
      tags: updateUploadDto.tags
        ? updateUploadDto.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
        : existing.tags,
      updatedAt: new Date().toISOString(),
    };

    this.records.set(id, updated);
    this.persist();
    return this.toResponse(updated);
  }

  remove(id: number): { deleted: true } {
    const existing = this.findOneRecord(id);

    if (existsSync(existing.absolutePath)) {
      rmSync(existing.absolutePath, { force: true });
    }

    this.records.delete(id);
    this.persist();
    return { deleted: true };
  }

  getFileContent(id: number): {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  } {
    const record = this.findOneRecord(id);

    if (!existsSync(record.absolutePath)) {
      throw new NotFoundException(`Upload file for record #${id} does not exist.`);
    }

    return {
      fileName: record.originalName,
      mimeType: record.mimeType,
      buffer: readFileSync(record.absolutePath),
    };
  }

  private toResponse(record: UploadRecord): UploadResponse {
    const { absolutePath, ...rest } = record;
    return {
      ...rest,
      contentUrl: `/uploads/${record.id}/content`,
    };
  }

  private findOneRecord(id: number): UploadRecord {
    const record = this.records.get(id);
    if (!record) {
      throw new NotFoundException(`Upload #${id} not found.`);
    }

    return record;
  }

  private persist() {
    this.store.save(Array.from(this.records.values()));
  }

  private assertAndNormalizeFile(file?: UploadedFileInput): NormalizedUploadFile {
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new BadRequestException('Multipart file is required in field "file".');
    }

    if (file.buffer.length > 20 * 1024 * 1024) {
      throw new BadRequestException('Uploaded file exceeds the 20MB size limit.');
    }

    return {
      buffer: file.buffer,
      mimeType: file.mimetype?.split(';')[0]?.trim() || 'application/octet-stream',
      originalName: file.originalname?.trim() || 'upload.bin',
      size: file.size ?? file.buffer.length,
    };
  }

  private resolveUploadDirectory(): string {
    const configuredDirectory = process.env.HEALTHCARE_UPLOAD_DIR;
    if (configuredDirectory) {
      return resolve(process.cwd(), configuredDirectory);
    }

    return resolve(process.cwd(), '.runtime-data', 'uploads');
  }

  private resolveFileExtension(originalName: string, mimeType: string): string {
    const extensionFromName = extname(originalName).toLowerCase();
    if (extensionFromName) {
      return extensionFromName;
    }

    const mimeToExtension = new Map<string, string>([
      ['image/jpeg', '.jpg'],
      ['image/png', '.png'],
      ['application/pdf', '.pdf'],
      ['text/plain', '.txt'],
    ]);

    return mimeToExtension.get(mimeType) ?? '.bin';
  }
}
