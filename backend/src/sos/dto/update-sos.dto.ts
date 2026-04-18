import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateSosDto } from './create-sos.dto';

const trimText = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export enum SosStatus {
    OPEN = 'open',
    ACKNOWLEDGED = 'acknowledged',
    RESOLVED = 'resolved',
    CANCELLED = 'cancelled',
}

export class UpdateSosDto extends PartialType(CreateSosDto) {
    @ApiPropertyOptional({
        description: 'Trạng thái xử lý SOS hiện tại.',
        enum: SosStatus,
        example: SosStatus.ACKNOWLEDGED,
    })
    @IsOptional()
    @IsEnum(SosStatus)
    status?: SosStatus;

    @ApiPropertyOptional({
        description: 'Thời điểm kết thúc xử lý SOS (ISO-8601).',
        example: '2026-04-18T11:30:00.000Z',
    })
    @IsOptional()
    @IsDateString()
    resolvedAt?: string;

    @ApiPropertyOptional({
        description: 'Ghi chú kết thúc xử lý sự cố.',
        maxLength: 500,
    })
    @Transform(trimText)
    @IsOptional()
    @IsString()
    @MaxLength(500)
    resolutionNote?: string;
}
