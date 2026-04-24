import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum SosTriggerSource {
  BUTTON = 'button',
  QR = 'qr',
  FACE = 'face',
}

const trimText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateSosDto {
  @ApiProperty({
    description: 'UUID của người dùng khởi tạo SOS.',
    format: 'uuid',
    example: '8f5ff605-f764-4f95-9d1d-64cbba89c3d9',
  })
  @Transform(trimText)
  @IsUUID('4')
  userId: string;

  @ApiProperty({
    description: 'Nguồn kích hoạt SOS.',
    enum: SosTriggerSource,
    example: SosTriggerSource.BUTTON,
  })
  @IsEnum(SosTriggerSource)
  triggerSource: SosTriggerSource;

  @ApiPropertyOptional({
    description: 'Vĩ độ hiện tại.',
    minimum: -90,
    maximum: 90,
    example: 10.762622,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Kinh độ hiện tại.',
    minimum: -180,
    maximum: 180,
    example: 106.660172,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Ghi chú mô tả tình trạng khẩn cấp.',
    maxLength: 500,
  })
  @Transform(trimText)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại người phản hồi trực tiếp.',
    maxLength: 32,
  })
  @Transform(trimText)
  @IsOptional()
  @IsString()
  @MaxLength(32)
  responderPhone?: string;
}
