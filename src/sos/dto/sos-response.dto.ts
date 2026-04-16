import { ApiProperty } from '@nestjs/swagger';

export class SosResponseDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  full_name!: string;

  @ApiProperty({ example: 'O+' })
  blood_type!: string;

  @ApiProperty({ example: 'Penicillin' })
  allergies!: string;

  @ApiProperty({ example: '0901234567' })
  emergency_contact!: string;
}