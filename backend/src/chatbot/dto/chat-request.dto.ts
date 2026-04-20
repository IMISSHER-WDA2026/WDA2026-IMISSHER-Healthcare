import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

const trimText = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export class ChatRequestDto {
    @ApiProperty({
        description: 'User question sent to the chatbot.',
        minLength: 2,
        maxLength: 2000,
        example: 'I have a headache and dizziness. What should I do?',
    })
    @Transform(trimText)
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(2000)
    message: string;
}
