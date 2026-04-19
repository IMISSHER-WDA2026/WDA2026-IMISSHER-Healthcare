import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateMedicineDto {
  @ApiProperty({ example: '1a7d2f2c-7fb4-4d6d-b66a-8e5d5a1f9b20', description: 'ID người dùng trong bảng profiles' })
  @IsUUID()
  user_id!: string;

  @ApiPropertyOptional({
    example: '3856e0d2-9694-471a-8531-2c3c4d5e6f70',
    description: 'ID thuốc từ bảng medicines_metadata. Nếu không truyền, có thể dùng name.',
  })
  @IsOptional()
  @IsUUID()
  medicine_id?: string;

  @ApiPropertyOptional({
    example: 'Panadol',
    description: 'Tên thuốc mẫu để tự tìm hoặc tạo medicines_metadata khi chưa có medicine_id.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 10, default: 1 })
  @IsOptional()
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng ít nhất phải là 1' })
  quantity?: number;

  @ApiPropertyOptional({ example: '2026-12-30', nullable: true })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày hết hạn không đúng định dạng (YYYY-MM-DD)' })
  expiry_date?: string;

  @ApiPropertyOptional({ example: 'Uống sau khi ăn sáng', nullable: true })
  @IsOptional()
  @IsString()
  custom_note?: string;
}