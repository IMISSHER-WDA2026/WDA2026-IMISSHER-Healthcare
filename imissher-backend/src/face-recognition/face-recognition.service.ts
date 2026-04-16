import { Injectable } from '@nestjs/common';
import { CreateFaceRecognitionDto } from './dto/create-face-recognition.dto';
import { UpdateFaceRecognitionDto } from './dto/update-face-recognition.dto';

@Injectable()
export class FaceRecognitionService {
  create(createFaceRecognitionDto: CreateFaceRecognitionDto) {
    return 'This action adds a new faceRecognition';
  }

  findAll() {
    return `This action returns all faceRecognition`;
  }

  findOne(id: number) {
    return `This action returns a #${id} faceRecognition`;
  }

  update(id: number, updateFaceRecognitionDto: UpdateFaceRecognitionDto) {
    return `This action updates a #${id} faceRecognition`;
  }

  remove(id: number) {
    return `This action removes a #${id} faceRecognition`;
  }
}
