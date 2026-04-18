import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';

export enum UploadCategory {
    AVATAR = 'avatar',
    MEDICAL_RECORD = 'medical_record',
    SOS_ATTACHMENT = 'sos_attachment',
    FACE_IMAGE = 'face_image',
    OTHER = 'other',
}

const trimText = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export class CreateUploadDto {
    @ApiPropertyOptional({
        description: 'Owner user UUID.',
        format: 'uuid',
    })
    @Transform(trimText)
    @IsOptional()
    @IsUUID('4')
    userId?: string;

    @ApiPropertyOptional({
        description: 'Upload category used by business modules.',
        enum: UploadCategory,
        example: UploadCategory.MEDICAL_RECORD,
    })
    @IsOptional()
    @IsEnum(UploadCategory)
    category?: UploadCategory;

    @ApiPropertyOptional({
        description: 'Short note attached to the uploaded file.',
        maxLength: 255,
    })
    @Transform(trimText)
    @IsOptional()
    @IsString()
    @MaxLength(255)
    note?: string;

    @ApiPropertyOptional({
        description: 'Optional tags for filtering in clients.',
        type: [String],
        maxItems: 10,
        example: ['prescription', '2026'],
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10)
    @IsString({ each: true })
    @MaxLength(32, { each: true })
    tags?: string[];
}
