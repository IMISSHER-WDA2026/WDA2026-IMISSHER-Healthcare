import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { basename } from 'node:path';
import { JsonPersistenceStore } from '../common/persistence/json-persistence.store';
import { CreateFaceRecognitionDto } from './dto/create-face-recognition.dto';
import { FaceRecognitionSource } from './dto/create-face-recognition.dto';
import { UpdateFaceRecognitionDto } from './dto/update-face-recognition.dto';

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
  data?: {
    dimensions?: number;
    vector?: unknown;
  };
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
  private readonly records = new Map<number, FaceRecognitionRecord>();
  private nextRecordId: number;
  private readonly store = new JsonPersistenceStore<FaceRecognitionRecord>(
    'face-recognition-records.json',
  );
  private readonly apiEndpoint =
    process.env.FACE_RECOGNITION_API_URL ??
    'http://localhost:8001/api/v1/face/recognize';
  private readonly defaultSimilarityThreshold = this.parseSimilarityThreshold();

  constructor() {
    const persistedRecords = this.store.load();
    for (const record of persistedRecords) {
      this.records.set(record.id, record);
    }

    this.nextRecordId = this.store.nextId(persistedRecords);
  }

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

  findAll(userId?: string): FaceRecognitionResult[] {
    return Array.from(this.records.values())
      .filter((record) => (userId ? record.userId === userId : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((record) => this.toResult(record));
  }

  findOne(id: number): FaceRecognitionResult {
    return this.toResult(this.findOneRecord(id));
  }

  update(id: number, updateFaceRecognitionDto: UpdateFaceRecognitionDto): FaceRecognitionResult {
    const existing = this.findOneRecord(id);
    const updated: FaceRecognitionRecord = {
      ...existing,
      userId: updateFaceRecognitionDto.userId ?? existing.userId,
      source: updateFaceRecognitionDto.source ?? existing.source,
      note: updateFaceRecognitionDto.note ?? existing.note,
      updatedAt: new Date().toISOString(),
    };

    this.records.set(id, updated);
    this.persist();
    return this.toResult(updated);
  }

  remove(id: number): { deleted: true } {
    this.findOneRecord(id);
    this.records.delete(id);
    this.persist();
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
    const match = this.findBestMatch(vector, threshold);

    const now = new Date().toISOString();
    const record: FaceRecognitionRecord = {
      id: this.nextRecordId,
      userId: createFaceRecognitionDto.userId,
      source: createFaceRecognitionDto.source ?? FaceRecognitionSource.UNKNOWN,
      note: createFaceRecognitionDto.note,
      aiMessage: payload.message,
      dimensions: vector.length,
      vector,
      matchedUserId: match?.userId,
      similarity: match?.similarity,
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(record.id, record);
    this.nextRecordId += 1;
    this.persist();
    return this.toResult(record);
  }

  private toResult(record: FaceRecognitionRecord): FaceRecognitionResult {
    const { vector, ...rest } = record;
    return {
      ...rest,
      vectorPreview: vector.slice(0, 8),
    };
  }

  private findOneRecord(id: number): FaceRecognitionRecord {
    const record = this.records.get(id);
    if (!record) {
      throw new NotFoundException(`Face recognition record #${id} not found.`);
    }

    return record;
  }

  private persist() {
    this.store.save(Array.from(this.records.values()));
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
    const formData = new FormData();
    const blob = new Blob([Uint8Array.from(imageInput.buffer)], {
      type: imageInput.mimeType,
    });
    formData.append('file', blob, imageInput.fileName);

    let response: Response;
    try {
      response = await fetch(this.apiEndpoint, {
        method: 'POST',
        body: formData,
      });
    } catch {
      throw new BadGatewayException('Face recognition AI service is unavailable.');
    }

    const rawText = await response.text();
    const payload = this.parseAiPayload(rawText);

    if (!response.ok) {
      throw new BadGatewayException(
        payload.message || `Face recognition AI returned status ${response.status}.`,
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
    const vector = payload.data?.vector;

    if (!Array.isArray(vector) || vector.length === 0) {
      throw new BadGatewayException('Face recognition AI did not return a valid vector.');
    }

    const normalizedVector = vector.map((value) => Number(value));
    if (normalizedVector.some((value) => !Number.isFinite(value))) {
      throw new BadGatewayException('Face recognition vector contains invalid values.');
    }

    return normalizedVector;
  }

  private findBestMatch(vector: number[], minSimilarity: number): FaceMatch | null {
    let bestMatch: FaceMatch | null = null;

    for (const record of this.records.values()) {
      if (!record.userId || record.vector.length !== vector.length) {
        continue;
      }

      const similarity = this.cosineSimilarity(record.vector, vector);
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
