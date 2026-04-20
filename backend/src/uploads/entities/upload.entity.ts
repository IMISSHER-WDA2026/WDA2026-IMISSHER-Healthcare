import { UploadCategory } from '../dto/create-upload.dto';

export class Upload {
    id: number;
    userId?: string;
    category: UploadCategory;
    note?: string;
    tags?: string[];
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    createdAt: string;
    updatedAt: string;
}
