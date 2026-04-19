import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ConsumeMedicineDto {
  @ApiProperty({ 
    example: 2, 
    description: 'Số lượng thuốc cần sử dụng' 
  })
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng ít nhất phải là 1' })
  amount!: number;
}