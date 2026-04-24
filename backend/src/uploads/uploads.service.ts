import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
  storagePath: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResponse extends Omit<UploadRecord, 'storagePath'> {
  contentUrl: string;
}

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
  private readonly supabaseBucket =
    process.env.SUPABASE_UPLOADS_BUCKET?.trim() || 'uploads';
  private readonly supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
  private readonly supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    '';
  private readonly supabase: SupabaseClient | null;

  constructor(
    @InjectRepository(Upload)
    private readonly uploadsRepository: Repository<Upload>,
  ) {
    if (this.supabaseUrl && this.supabaseServiceKey) {
      this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey, {
        auth: { persistSession: false },
      });
    } else {
      this.supabase = null;
    }
  }

  onModuleInit(): void {
    if (!this.supabase) {
      this.logger.warn(
        'Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable uploads.',
      );
    }
  }

  async create(
    createUploadDto: CreateUploadDto,
    file?: UploadedFileInput,
  ): Promise<UploadResponse> {
    const supabase = this.requireSupabase();
    const normalizedFile = this.assertAndNormalizeFile(file);
    const extension = this.resolveFileExtension(
      normalizedFile.originalName,
      normalizedFile.mimeType,
    );
    const storedName = `${Date.now()}-${randomUUID()}${extension}`;
    const storagePath = this.buildStoragePath(
      createUploadDto.userId ?? undefined,
      storedName,
    );

    const { error: uploadError } = await supabase.storage
      .from(this.supabaseBucket)
      .upload(storagePath, normalizedFile.buffer, {
        contentType: normalizedFile.mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new InternalServerErrorException(
        `Failed to upload file to storage: ${uploadError.message}`,
      );
    }

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
      absolutePath: storagePath,
    });

    try {
      const savedRecord = await this.uploadsRepository.save(record);
      return this.toResponse(savedRecord);
    } catch (error) {
      await supabase.storage.from(this.supabaseBucket).remove([storagePath]);
      throw error;
    }
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

  async update(
    id: number,
    updateUploadDto: UpdateUploadDto,
  ): Promise<UploadResponse> {
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
    const supabase = this.requireSupabase();

    const { error: removeError } = await supabase.storage
      .from(this.supabaseBucket)
      .remove([existing.absolutePath]);

    if (removeError) {
      this.logger.warn(
        `Failed to delete storage object ${existing.absolutePath}: ${removeError.message}`,
      );
    }

    await this.uploadsRepository.delete({ id });
    return { deleted: true };
  }

  async getFileContent(
    id: number,
    requestingUserId?: string,
  ): Promise<{
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }> {
    const record = await this.findOneRecord(id);

    if (
      requestingUserId &&
      record.userId &&
      record.userId !== requestingUserId
    ) {
      throw new ForbiddenException(
        'You do not have permission to access this file.',
      );
    }

    const supabase = this.requireSupabase();
    const { data, error } = await supabase.storage
      .from(this.supabaseBucket)
      .download(record.absolutePath);

    if (error || !data) {
      throw new NotFoundException(
        `Upload file for record #${id} could not be retrieved from storage.`,
      );
    }

    const arrayBuffer = await data.arrayBuffer();
    return {
      fileName: record.originalName,
      mimeType: record.mimeType,
      buffer: Buffer.from(arrayBuffer),
    };
  }

  private toResponse(record: Upload): UploadResponse {
    const { absolutePath, ...rest } = {
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

  private assertAndNormalizeFile(
    file?: UploadedFileInput,
  ): NormalizedUploadFile {
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new BadRequestException(
        'Multipart file is required in field "file".',
      );
    }

    if (file.buffer.length > 20 * 1024 * 1024) {
      throw new BadRequestException(
        'Uploaded file exceeds the 20MB size limit.',
      );
    }

    return {
      buffer: file.buffer,
      mimeType:
        file.mimetype?.split(';')[0]?.trim() || 'application/octet-stream',
      originalName: file.originalname?.trim() || 'upload.bin',
      size: file.size ?? file.buffer.length,
    };
  }

  private buildStoragePath(
    userId: string | undefined,
    storedName: string,
  ): string {
    const prefix = userId?.trim() ? userId.trim() : 'anonymous';
    return `${prefix}/${storedName}`;
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

  private requireSupabase(): SupabaseClient {
    if (!this.supabase) {
      throw new InternalServerErrorException(
        'Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
    }
    return this.supabase;
  }
}
