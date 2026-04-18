import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trimText = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export class UpdateUserProfileDto {
    @ApiPropertyOptional({ minLength: 2, maxLength: 120, example: 'Le Thi C' })
    @Transform(trimText)
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(120)
    fullName?: string;

    @ApiPropertyOptional({ maxLength: 32, example: '+84901234567' })
    @Transform(trimText)
    @IsOptional()
    @IsString()
    @MaxLength(32)
    phone?: string;

    @ApiPropertyOptional({ maxLength: 8, example: 'A+' })
    @Transform(trimText)
    @IsOptional()
    @IsString()
    @MaxLength(8)
    bloodType?: string;

    @ApiPropertyOptional({ maxLength: 500, example: 'Penicillin allergy' })
    @Transform(trimText)
    @IsOptional()
    @IsString()
    @MaxLength(500)
    allergies?: string;

    @ApiPropertyOptional({ maxLength: 500, example: 'Asthma' })
    @Transform(trimText)
    @IsOptional()
    @IsString()
    @MaxLength(500)
    chronicConditions?: string;

    @ApiPropertyOptional({ maxLength: 120, example: 'Tran Thi D' })
    @Transform(trimText)
    @IsOptional()
    @IsString()
    @MaxLength(120)
    emergencyContactName?: string;

    @ApiPropertyOptional({ maxLength: 32, example: '+84987654321' })
    @Transform(trimText)
    @IsOptional()
    @IsString()
    @MaxLength(32)
    emergencyContactPhone?: string;
}
