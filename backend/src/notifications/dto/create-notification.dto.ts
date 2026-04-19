import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';

export enum NotificationType {
    INFO = 'info',
    WARNING = 'warning',
    CRITICAL = 'critical',
    REMINDER = 'reminder',
}

const trimText = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export class CreateNotificationDto {
    @ApiPropertyOptional({
        description: 'Target user UUID. Leave empty for broadcast notification.',
        format: 'uuid',
    })
    @Transform(trimText)
    @IsOptional()
    @IsUUID('4')
    userId?: string;

    @ApiProperty({
        description: 'Notification title.',
        maxLength: 120,
        example: 'Medicine Reminder',
    })
    @Transform(trimText)
    @IsString()
    @MinLength(1)
    @MaxLength(120)
    title: string;

    @ApiProperty({
        description: 'Notification message body.',
        maxLength: 1000,
        example: 'It is time to take your blood pressure medication.',
    })
    @Transform(trimText)
    @IsString()
    @MinLength(1)
    @MaxLength(1000)
    message: string;

    @ApiPropertyOptional({
        description: 'Notification severity/type.',
        enum: NotificationType,
        default: NotificationType.INFO,
    })
    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType;

    @ApiPropertyOptional({
        description: 'Optional metadata payload for clients.',
        type: 'object',
        additionalProperties: true,
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;

    @ApiPropertyOptional({
        description: 'Initial read state. Defaults to false.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    isRead?: boolean;
}
