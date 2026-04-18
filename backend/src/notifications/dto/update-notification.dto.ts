import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { CreateNotificationDto } from './create-notification.dto';

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @ApiPropertyOptional({
    description: 'Numeric id used by websocket update event payload.',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  id?: number;
}
