import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { basename } from 'node:path';
import { Repository } from 'typeorm';
import { CreateFaceRecognitionDto } from './dto/create-face-recognition.dto';
import { FaceRecognitionSource } from './dto/create-face-recognition.dto';
import { UpdateFaceRecognitionDto } from './dto/update-face-recognition.dto';
import { FaceRecognition } from './entities/face-recognition.entity';

interface UploadedImageInput {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
}

interface ResolvedImageInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

interface FaceRecognitionApiPayload {
  status?: string;
  message?: string;
  error?: string;
  data?: {
    dimensions?: number;
    vector?: unknown;
    embedding?: unknown;
    embeddings?: unknown;
  };
  vector?: unknown;
  embedding?: unknown;
  embeddings?: unknown;
}

interface FaceMatch {
  userId: string;
  similarity: number;
}

export interface FaceRecognitionRecord {
  id: number;
  userId?: string;
  source: FaceRecognitionSource;
  note?: string;
  aiMessage?: string;
  dimensions: number;
  vector: number[];
  matchedUserId?: string;
  similarity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FaceRecognitionResult extends Omit<FaceRecognitionRecord, 'vector'> {
  vectorPreview: number[];
}

@Injectable()
export class FaceRecognitionService {
  private readonly apiEndpoint =
    process.env.FACE_RECOGNITION_API_URL?.trim() ??
    'http://localhost:8001/api/v1/face/recognize';
  private readonly apiToken = process.env.FACE_RECOGNITION_API_TOKEN?.trim();
  private readonly apiRequestMode = this.normalizeRequestMode(
    process.env.FACE_RECOGNITION_REQUEST_MODE,
  );
  private readonly apiTimeoutMs = this.parseApiTimeout(
    process.env.FACE_RECOGNITION_TIMEOUT_MS,
  );
  private readonly defaultSimilarityThreshold = this.parseSimilarityThreshold();

  constructor(
    @InjectRepository(FaceRecognition)
    private readonly faceRecognitionRepository: Repository<FaceRecognition>,
  ) { }

  async create(createFaceRecognitionDto: CreateFaceRecognitionDto): Promise<FaceRecognitionResult> {
    const imageInput = await this.resolveImageInput(createFaceRecognitionDto);
    return this.processRecognition(createFaceRecognitionDto, imageInput);
  }

  async createFromUpload(
    createFaceRecognitionDto: CreateFaceRecognitionDto,
    file?: UploadedImageInput,
  ): Promise<FaceRecognitionResult> {
    const normalizedUpload = this.assertAndNormalizeUpload(file);
    return this.processRecognition(
      {
        ...createFaceRecognitionDto,
        source: createFaceRecognitionDto.source ?? FaceRecognitionSource.UPLOAD,
      },
      normalizedUpload,
    );
  }

  async findAll(userId?: string): Promise<FaceRecognitionResult[]> {
    const records = userId
      ? await this.faceRecognitionRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      })
      : await this.faceRecognitionRepository.find({ order: { createdAt: 'DESC' } });

    return records.map((record) => this.toResult(record));
  }

  async findOne(id: number): Promise<FaceRecognitionResult> {
    return this.toResult(await this.findOneRecord(id));
  }

  async update(
    id: number,
    updateFaceRecognitionDto: UpdateFaceRecognitionDto,
  ): Promise<FaceRecognitionResult> {
    const existing = await this.findOneRecord(id);

    existing.userId = updateFaceRecognitionDto.userId ?? existing.userId;
    existing.source = updateFaceRecognitionDto.source ?? existing.source;

    if (updateFaceRecognitionDto.note !== undefined) {
      existing.note = updateFaceRecognitionDto.note.trim() || null;
    }

    const savedRecord = await this.faceRecognitionRepository.save(existing);
    return this.toResult(savedRecord);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    await this.findOneRecord(id);
    await this.faceRecognitionRepository.delete({ id });
    return { deleted: true };
  }

  private async processRecognition(
    createFaceRecognitionDto: CreateFaceRecognitionDto,
    imageInput: ResolvedImageInput,
  ): Promise<FaceRecognitionResult> {
    this.assertImageInput(imageInput);

    const payload = await this.callAiRecognize(imageInput);
    const vector = this.extractVector(payload);
    const threshold =
      createFaceRecognitionDto.minSimilarity ?? this.defaultSimilarityThreshold;
    const match = await this.findBestMatch(vector, threshold);

    const record = this.faceRecognitionRepository.create({
      userId: createFaceRecognitionDto.userId,
      source: createFaceRecognitionDto.source ?? FaceRecognitionSource.UNKNOWN,
      note: createFaceRecognitionDto.note?.trim() || null,
      aiMessage: payload.message ?? null,
      dimensions: vector.length,
      vector,
      matchedUserId: match?.userId ?? null,
      similarity: match?.similarity ?? null,
    });

    const savedRecord = await this.faceRecognitionRepository.save(record);
    return this.toResult(savedRecord);
  }

  private toResult(record: FaceRecognition): FaceRecognitionResult {
    const normalizedVector = this.normalizeStoredVector(record.vector);

    return {
      id: record.id,
      userId: record.userId ?? undefined,
      source: record.source,
      note: record.note ?? undefined,
      aiMessage: record.aiMessage ?? undefined,
      dimensions: record.dimensions,
      vectorPreview: normalizedVector.slice(0, 8),
      matchedUserId: record.matchedUserId ?? undefined,
      similarity: record.similarity ?? undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private async findOneRecord(id: number): Promise<FaceRecognition> {
    const record = await this.faceRecognitionRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Face recognition record #${id} not found.`);
    }

    return record;
  }

  private parseSimilarityThreshold(): number {
    const configuredThreshold = Number.parseFloat(
      process.env.FACE_RECOGNITION_MATCH_THRESHOLD ?? '',
    );

    if (
      Number.isFinite(configuredThreshold) &&
      configuredThreshold >= 0 &&
      configuredThreshold <= 1
    ) {
      return configuredThreshold;
    }

    return 0.82;
  }

  private assertAndNormalizeUpload(file?: UploadedImageInput): ResolvedImageInput {
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new BadRequestException('Image file is required in multipart field "file".');
    }

    const mimeType = file.mimetype?.split(';')[0]?.trim() || 'application/octet-stream';
    const fileName = file.originalname?.trim() || 'face-upload.jpg';

    return {
      buffer: file.buffer,
      mimeType,
      fileName,
    };
  }

  private async resolveImageInput(
    createFaceRecognitionDto: CreateFaceRecognitionDto,
  ): Promise<ResolvedImageInput> {
    if (createFaceRecognitionDto.imageBase64) {
      return this.parseBase64Image(createFaceRecognitionDto.imageBase64);
    }

    if (createFaceRecognitionDto.imageUrl) {
      return this.fetchImageFromUrl(createFaceRecognitionDto.imageUrl);
    }

    throw new BadRequestException(
      'Provide imageBase64, imageUrl, or use multipart endpoint with file upload.',
    );
  }

  private parseBase64Image(imageBase64: string): ResolvedImageInput {
    const trimmed = imageBase64.trim();
    const dataUrlMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(trimmed);

    let mimeType = 'image/jpeg';
    let rawBase64 = trimmed;

    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1];
      rawBase64 = dataUrlMatch[2];
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(rawBase64, 'base64');
    } catch {
      throw new BadRequestException('imageBase64 is not a valid base64 payload.');
    }

    if (buffer.length === 0) {
      throw new BadRequestException('imageBase64 payload is empty.');
    }

    return {
      buffer,
      mimeType,
      fileName: 'face-base64.jpg',
    };
  }

  private async fetchImageFromUrl(imageUrl: string): Promise<ResolvedImageInput> {
    let response: Response;
    try {
      response = await fetch(imageUrl);
    } catch {
      throw new BadRequestException('Unable to download image from imageUrl.');
    }

    if (!response.ok) {
      throw new BadRequestException(`Unable to download image from imageUrl (${response.status}).`);
    }

    const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = this.fileNameFromUrl(imageUrl);

    return {
      buffer,
      mimeType,
      fileName,
    };
  }

  private fileNameFromUrl(imageUrl: string): string {
    try {
      const url = new URL(imageUrl);
      const name = basename(url.pathname);
      return name || 'face-url-image.jpg';
    } catch {
      return 'face-url-image.jpg';
    }
  }

  private assertImageInput(imageInput: ResolvedImageInput) {
    if (!imageInput.mimeType.startsWith('image/')) {
      throw new BadRequestException('Only image mime types are supported.');
    }

    if (imageInput.buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException('Image size exceeds the 10MB limit.');
    }
  }

  private async callAiRecognize(
    imageInput: ResolvedImageInput,
  ): Promise<FaceRecognitionApiPayload> {
    const headers: Record<string, string> = {};
    if (this.apiToken) {
      headers.Authorization = `Bearer ${this.apiToken}`;
    }

    let body: BodyInit;
    if (this.apiRequestMode === 'raw') {
      headers['Content-Type'] = imageInput.mimeType || 'application/octet-stream';
      body = Uint8Array.from(imageInput.buffer);
    } else if (this.apiRequestMode === 'json-base64') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({
        imageBase64: this.buildBase64DataUrl(imageInput),
        fileName: imageInput.fileName,
      });
    } else {
      const formData = new FormData();
      const blob = new Blob([Uint8Array.from(imageInput.buffer)], {
        type: imageInput.mimeType,
      });
      formData.append('file', blob, imageInput.fileName);
      body = formData;
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.apiTimeoutMs);

    let response: Response;
    try {
      response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadGatewayException('Face recognition AI request timed out.');
      }
      throw new BadGatewayException('Face recognition AI service is unavailable.');
    } finally {
      clearTimeout(timeoutHandle);
    }

    const rawText = await response.text();
    const payload = this.parseAiPayload(rawText);

    if (!response.ok) {
      throw new BadGatewayException(
        payload.message ||
        payload.error ||
        `Face recognition AI returned status ${response.status}.`,
      );
    }

    return payload;
  }

  private parseAiPayload(rawText: string): FaceRecognitionApiPayload {
    if (!rawText) {
      return {};
    }

    try {
      return JSON.parse(rawText) as FaceRecognitionApiPayload;
    } catch {
      return {
        message: rawText,
      };
    }
  }

  private extractVector(payload: FaceRecognitionApiPayload): number[] {
    const candidates: unknown[] = [
      payload.data?.vector,
      payload.data?.embedding,
      payload.data?.embeddings,
      payload.vector,
      payload.embedding,
      payload.embeddings,
    ];

    for (const candidate of candidates) {
      const normalized = this.toNumericVector(candidate);
      if (normalized) {
        return normalized;
      }
    }

    throw new BadGatewayException('Face recognition AI did not return a valid vector.');
  }

  private toNumericVector(value: unknown): number[] | null {
    if (Array.isArray(value) && value.length > 0) {
      if (Array.isArray(value[0])) {
        return this.toNumericVector(value[0]);
      }

      const normalized = value.map((item) => Number(item));
      if (normalized.some((item) => !Number.isFinite(item))) {
        return null;
      }

      return normalized;
    }

    return null;
  }

  private normalizeStoredVector(value: unknown): number[] {
    return this.toNumericVector(value) ?? [];
  }

  private buildBase64DataUrl(imageInput: ResolvedImageInput): string {
    return `data:${imageInput.mimeType};base64,${imageInput.buffer.toString('base64')}`;
  }

  private normalizeRequestMode(rawMode: string | undefined):
    | 'multipart'
    | 'raw'
    | 'json-base64' {
    const normalized = rawMode?.trim().toLowerCase();
    if (normalized === 'raw') {
      return 'raw';
    }

    if (normalized === 'json-base64') {
      return 'json-base64';
    }

    return 'multipart';
  }

  private parseApiTimeout(rawTimeout: string | undefined): number {
    const value = Number.parseInt(rawTimeout ?? '', 10);
    if (!Number.isFinite(value)) {
      return 45_000;
    }

    return Math.min(Math.max(value, 3_000), 180_000);
  }

  private async findBestMatch(
    vector: number[],
    minSimilarity: number,
  ): Promise<FaceMatch | null> {
    let bestMatch: FaceMatch | null = null;

    const records = await this.faceRecognitionRepository
      .createQueryBuilder('record')
      .where('record.userId IS NOT NULL')
      .andWhere('record.dimensions = :dimensions', { dimensions: vector.length })
      .getMany();

    for (const record of records) {
      if (!record.userId) {
        continue;
      }

      const storedVector = this.normalizeStoredVector(record.vector);
      if (storedVector.length !== vector.length) {
        continue;
      }

      const similarity = this.cosineSimilarity(storedVector, vector);
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = {
          userId: record.userId,
          similarity,
        };
      }
    }

    if (!bestMatch || bestMatch.similarity < minSimilarity) {
      return null;
    }

    return bestMatch;
  }

  private cosineSimilarity(left: number[], right: number[]): number {
    let dotProduct = 0;
    let leftNorm = 0;
    let rightNorm = 0;

    for (let i = 0; i < left.length; i += 1) {
      dotProduct += left[i] * right[i];
      leftNorm += left[i] ** 2;
      rightNorm += right[i] ** 2;
    }

    if (leftNorm === 0 || rightNorm === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
  }
}
