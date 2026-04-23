import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { Repository } from 'typeorm';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UploadCategory } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { Upload } from './entities/upload.entity';

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
  private readonly uploadDirectory = this.resolveUploadDirectory();

  constructor(
    @InjectRepository(Upload)
    private readonly uploadsRepository: Repository<Upload>,
  ) {
    if (!existsSync(this.uploadDirectory)) {
      mkdirSync(this.uploadDirectory, { recursive: true });
    }
  }

  async create(
    createUploadDto: CreateUploadDto,
    file?: UploadedFileInput,
  ): Promise<UploadResponse> {
    const normalizedFile = this.assertAndNormalizeFile(file);
    const extension = this.resolveFileExtension(
      normalizedFile.originalName,
      normalizedFile.mimeType,
    );
    const storedName = `${Date.now()}-${randomUUID()}${extension}`;
    const absolutePath = resolve(this.uploadDirectory, storedName);

    writeFileSync(absolutePath, normalizedFile.buffer);

    const record = this.uploadsRepository.create({
      userId: createUploadDto.userId,
      category: createUploadDto.category ?? UploadCategory.OTHER,
      note: createUploadDto.note?.trim() || null,
      tags:
        createUploadDto.tags
          ?.map((tag) => tag.trim())
          .filter((tag) => tag.length > 0) ?? null,
      originalName: normalizedFile.originalName,
      storedName,
      mimeType: normalizedFile.mimeType,
      size: normalizedFile.size,
      absolutePath,
    });

    const savedRecord = await this.uploadsRepository.save(record);
    return this.toResponse(savedRecord);
  }

  async findAll(userId?: string): Promise<UploadResponse[]> {
    const records = userId
      ? await this.uploadsRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      })
      : await this.uploadsRepository.find({ order: { createdAt: 'DESC' } });

    return records.map((record) => this.toResponse(record));
  }

  async findOne(id: number): Promise<UploadResponse> {
    return this.toResponse(await this.findOneRecord(id));
  }

  async update(id: number, updateUploadDto: UpdateUploadDto): Promise<UploadResponse> {
    const existing = await this.findOneRecord(id);

    existing.userId = updateUploadDto.userId ?? existing.userId;
    existing.category = updateUploadDto.category ?? existing.category;

    if (updateUploadDto.note !== undefined) {
      existing.note = updateUploadDto.note.trim() || null;
    }

    if (updateUploadDto.tags !== undefined) {
      existing.tags = updateUploadDto.tags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    }

    const savedRecord = await this.uploadsRepository.save(existing);
    return this.toResponse(savedRecord);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const existing = await this.findOneRecord(id);

    if (existsSync(existing.absolutePath)) {
      rmSync(existing.absolutePath, { force: true });
    }

    await this.uploadsRepository.delete({ id });
    return { deleted: true };
  }

  async getFileContent(id: number): Promise<{
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }> {
    const record = await this.findOneRecord(id);

    if (!existsSync(record.absolutePath)) {
      throw new NotFoundException(`Upload file for record #${id} does not exist.`);
    }

    return {
      fileName: record.originalName,
      mimeType: record.mimeType,
      buffer: readFileSync(record.absolutePath),
    };
  }

  private toResponse(record: Upload): UploadResponse {
    const serialized: UploadRecord = {
      id: record.id,
      userId: record.userId ?? undefined,
      category: record.category,
      note: record.note ?? undefined,
      tags: record.tags ?? undefined,
      originalName: record.originalName,
      storedName: record.storedName,
      mimeType: record.mimeType,
      size: record.size,
      absolutePath: record.absolutePath,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };

    const { absolutePath, ...rest } = serialized;
    void absolutePath;

    return {
      ...rest,
      contentUrl: `/uploads/${record.id}/content`,
    };
  }

  private async findOneRecord(id: number): Promise<Upload> {
    const record = await this.uploadsRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Upload #${id} not found.`);
    }

    return record;
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
