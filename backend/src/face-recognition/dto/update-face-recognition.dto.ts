import { PartialType } from '@nestjs/swagger';
import { CreateFaceRecognitionDto } from './create-face-recognition.dto';

export class UpdateFaceRecognitionDto extends PartialType(
  CreateFaceRecognitionDto,
) {}
