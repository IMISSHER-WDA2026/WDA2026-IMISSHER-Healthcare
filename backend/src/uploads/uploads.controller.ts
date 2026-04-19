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
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UploadsService } from './uploads.service';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UploadCategory } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) { }

  @ApiOperation({ summary: 'Upload a file with metadata.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        userId: { type: 'string', format: 'uuid' },
        category: { type: 'string', enum: Object.values(UploadCategory) },
        note: { type: 'string' },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @Post()
  create(
    @Body() createUploadDto: CreateUploadDto,
    @UploadedFile()
    file:
      | {
        buffer: Buffer;
        mimetype?: string;
        originalname?: string;
        size?: number;
      }
      | undefined,
  ) {
    return this.uploadsService.create(createUploadDto, file);
  }

  @ApiOperation({ summary: 'List upload metadata records.' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by userId.' })
  @Get()
  findAll(@Query('userId') userId?: string) {
    return this.uploadsService.findAll(userId);
  }

  @ApiOperation({ summary: 'Get upload metadata by id.' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.uploadsService.findOne(id);
  }

  @ApiOperation({ summary: 'Download or stream uploaded file by id.' })
  @Get(':id/content')
  getContent(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = this.uploadsService.getFileContent(id);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);
    return new StreamableFile(file.buffer);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUploadDto: UpdateUploadDto,
  ) {
    return this.uploadsService.update(id, updateUploadDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.uploadsService.remove(id);
  }
}
