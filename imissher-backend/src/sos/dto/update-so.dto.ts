import { PartialType } from '@nestjs/swagger';
import { CreateSoDto } from './create-so.dto';

export class UpdateSoDto extends PartialType(CreateSoDto) {}
