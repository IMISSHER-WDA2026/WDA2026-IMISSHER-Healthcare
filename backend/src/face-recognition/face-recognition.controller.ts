import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FaceRecognitionService } from './face-recognition.service';
import { CreateFaceRecognitionDto } from './dto/create-face-recognition.dto';
import { FaceRecognitionSource } from './dto/create-face-recognition.dto';
import { UpdateFaceRecognitionDto } from './dto/update-face-recognition.dto';

@ApiTags('Face Recognition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('face-recognition')
export class FaceRecognitionController {
  constructor(private readonly faceRecognitionService: FaceRecognitionService) { }

  @ApiOperation({ summary: 'Recognize face from multipart image upload.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        userId: { type: 'string', format: 'uuid' },
        source: { type: 'string', enum: Object.values(FaceRecognitionSource) },
        note: { type: 'string' },
        minSimilarity: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @Post('recognize')
  recognizeFromUpload(
    @UploadedFile()
    file:
      | {
        buffer: Buffer;
        mimetype?: string;
        originalname?: string;
        size?: number;
      }
      | undefined,
    @Body() createFaceRecognitionDto: CreateFaceRecognitionDto,
  ) {
    return this.faceRecognitionService.createFromUpload(createFaceRecognitionDto, file);
  }

  @ApiOperation({ summary: 'Recognize face from base64 or image URL.' })
  @Post()
  create(@Body() createFaceRecognitionDto: CreateFaceRecognitionDto) {
    return this.faceRecognitionService.create(createFaceRecognitionDto);
  }

  @ApiOperation({ summary: 'List face recognition records.' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter records by userId.' })
  @Get()
  findAll(@Query('userId') userId?: string) {
    return this.faceRecognitionService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.faceRecognitionService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFaceRecognitionDto: UpdateFaceRecognitionDto,
  ) {
    return this.faceRecognitionService.update(id, updateFaceRecognitionDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.faceRecognitionService.remove(id);
  }
}
