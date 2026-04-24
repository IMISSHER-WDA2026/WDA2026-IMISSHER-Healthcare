import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum FaceRecognitionSource {
  CAMERA = 'camera',
  UPLOAD = 'upload',
  SOS = 'sos',
  UNKNOWN = 'unknown',
}

const trimText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateFaceRecognitionDto {
  @ApiPropertyOptional({
    description: 'User UUID to bind this face vector to a known user profile.',
    format: 'uuid',
  })
  @Transform(trimText)
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({
    description:
      'Base64 image payload. Data-URL format is supported (for example: data:image/jpeg;base64,...).',
    maxLength: 16_000_000,
  })
  @Transform(trimText)
  @IsOptional()
  @IsString()
  @MaxLength(16_000_000)
  imageBase64?: string;

  @ApiPropertyOptional({
    description: 'Remote image URL used for recognition.',
    example: 'https://example.com/patient-face.jpg',
  })
  @Transform(trimText)
  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Source that triggered this recognition request.',
    enum: FaceRecognitionSource,
    example: FaceRecognitionSource.SOS,
  })
  @IsOptional()
  @IsEnum(FaceRecognitionSource)
  source?: FaceRecognitionSource;

  @ApiPropertyOptional({
    description:
      'Optional match threshold between 0 and 1. If omitted, service default is used.',
    minimum: 0,
    maximum: 1,
    example: 0.82,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(1)
  minSimilarity?: number;

  @ApiPropertyOptional({
    description: 'Optional note for audit and debugging.',
    maxLength: 255,
  })
  @Transform(trimText)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
