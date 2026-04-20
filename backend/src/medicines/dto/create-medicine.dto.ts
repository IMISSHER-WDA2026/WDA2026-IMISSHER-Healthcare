import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsDateString,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

const trimText = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export class CreateMedicineDto {
    @ApiProperty({
        description: 'Tên thuốc.',
        minLength: 2,
        maxLength: 120,
        example: 'Paracetamol 500mg',
    })
    @Transform(trimText)
    @IsString()
    @MinLength(2)
    @MaxLength(120)
    name: string;

    @ApiPropertyOptional({
        description: 'Hoạt chất chính của thuốc.',
        maxLength: 120,
        example: 'Paracetamol',
    })
    @Transform(trimText)
    @IsOptional()
    @IsString()
    @MaxLength(120)
    active_ingredient?: string;

    @ApiPropertyOptional({
        description: 'Mã vạch thuốc.',
        maxLength: 64,
        example: '8938505974199',
    })
    @Transform(trimText)
    @IsOptional()
    @IsString()
    @MaxLength(64)
    barcode?: string;

    @ApiPropertyOptional({
        description: 'Mô tả ngắn về thuốc và công dụng.',
        maxLength: 2000,
    })
    @Transform(trimText)
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({
        description: 'Thông tin chống chỉ định.',
        maxLength: 2000,
    })
    @Transform(trimText)
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    contraindications?: string;

    @ApiPropertyOptional({
        description: 'ID người dùng sở hữu thuốc trong tủ thuốc cá nhân.',
        example: '061b9900-b756-4a44-a534-e0c2e09866f9',
    })
    @Transform(trimText)
    @IsOptional()
    @IsUUID('4')
    ownerId?: string;

    @ApiPropertyOptional({
        description: 'Số lượng thuốc hiện có.',
        minimum: 1,
        maximum: 100000,
        example: 14,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100000)
    quantity?: number;

    @ApiPropertyOptional({
        description: 'Đơn vị của số lượng thuốc.',
        maxLength: 32,
        example: 'viên',
    })
    @Transform(trimText)
    @IsOptional()
    @IsString()
    @MaxLength(32)
    unit?: string;

    @ApiPropertyOptional({
        description: 'Ngày hết hạn dạng ISO-8601.',
        example: '2026-10-15',
    })
    @Transform(trimText)
    @IsOptional()
    @IsDateString()
    expiresAt?: string;

    @ApiPropertyOptional({
        description: 'Giờ nhắc dùng thuốc theo định dạng HH:mm.',
        example: '08:00',
    })
    @Transform(trimText)
    @IsOptional()
    @IsString()
    @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    reminderTime?: string;
}
