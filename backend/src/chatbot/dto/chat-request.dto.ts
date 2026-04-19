import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

const trimText = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export class ChatRequestDto {
    @ApiProperty({
        description: 'Câu hỏi của người dùng gửi tới chatbot.',
        minLength: 2,
        maxLength: 2000,
        example: 'Tôi bị đau đầu và chóng mặt thì nên làm gì?',
    })
    @Transform(trimText)
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(2000)
    message: string;
}
