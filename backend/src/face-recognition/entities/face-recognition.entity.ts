import { FaceRecognitionSource } from '../dto/create-face-recognition.dto';

export class FaceRecognition {
    id: number;
    userId?: string;
    source: FaceRecognitionSource;
    note?: string;
    dimensions: number;
    matchedUserId?: string;
    similarity?: number;
    createdAt: string;
    updatedAt: string;
}
