import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FaceRecognitionService } from './face-recognition.service';
import { CreateFaceRecognitionDto } from './dto/create-face-recognition.dto';
import { UpdateFaceRecognitionDto } from './dto/update-face-recognition.dto';

@Controller('face-recognition')
export class FaceRecognitionController {
  constructor(private readonly faceRecognitionService: FaceRecognitionService) {}

  @Post()
  create(@Body() createFaceRecognitionDto: CreateFaceRecognitionDto) {
    return this.faceRecognitionService.create(createFaceRecognitionDto);
  }

  @Get()
  findAll() {
    return this.faceRecognitionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.faceRecognitionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFaceRecognitionDto: UpdateFaceRecognitionDto) {
    return this.faceRecognitionService.update(+id, updateFaceRecognitionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.faceRecognitionService.remove(+id);
  }
}
