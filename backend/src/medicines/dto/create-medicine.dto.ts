import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
}
