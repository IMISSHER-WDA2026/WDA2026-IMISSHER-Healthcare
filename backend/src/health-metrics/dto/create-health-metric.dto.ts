import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum HealthMetricType {
  HEART_RATE = 'heart_rate',
  SPO2 = 'spo2',
  BLOOD_PRESSURE_SYS = 'blood_pressure_sys',
  BLOOD_PRESSURE_DIA = 'blood_pressure_dia',
  TEMPERATURE = 'temperature',
  GLUCOSE = 'glucose',
  WEIGHT = 'weight',
  HEIGHT = 'height',
}

export enum HealthMetricSource {
  MANUAL = 'manual',
  DEVICE = 'device',
  IMPORTED = 'imported',
}

const trimText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateHealthMetricDto {
  @ApiProperty({
    description: 'UUID người dùng.',
    format: 'uuid',
    example: 'b2608c17-36ca-4bb1-b9e8-f5e83273389a',
  })
  @Transform(trimText)
  @IsUUID('4')
  userId: string;

  @ApiProperty({
    description: 'Loại chỉ số sức khỏe.',
    enum: HealthMetricType,
    example: HealthMetricType.HEART_RATE,
  })
  @IsEnum(HealthMetricType)
  metricType: HealthMetricType;

  @ApiProperty({
    description: 'Giá trị chỉ số sức khỏe.',
    example: 78,
    minimum: 0,
    maximum: 10000,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000)
  value: number;

  @ApiPropertyOptional({
    description: 'Đơn vị đo.',
    maxLength: 16,
    example: 'bpm',
  })
  @Transform(trimText)
  @IsOptional()
  @IsString()
  @MaxLength(16)
  unit?: string;

  @ApiPropertyOptional({
    description: 'Thời điểm đo chỉ số (ISO-8601).',
    example: '2026-04-18T11:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  measuredAt?: string;

  @ApiPropertyOptional({
    description: 'Nguồn dữ liệu chỉ số.',
    enum: HealthMetricSource,
    example: HealthMetricSource.DEVICE,
  })
  @IsOptional()
  @IsEnum(HealthMetricSource)
  source?: HealthMetricSource;

  @ApiPropertyOptional({
    description: 'Ghi chú đi kèm chỉ số.',
    maxLength: 500,
  })
  @Transform(trimText)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
