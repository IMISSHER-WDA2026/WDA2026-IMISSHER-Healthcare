import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SosService } from './sos.service';
import { CreateSosDto, SosTriggerSource } from './dto/create-sos.dto';
import { SosStatus, UpdateSosDto } from './dto/update-sos.dto';

class BystanderSosDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

@ApiTags('SOS')
@Controller('sos')
export class SosController {
  constructor(private readonly sosService: SosService) { }

  @ApiOperation({ summary: 'Tạo SOS khẩn cấp từ người xung quanh (không cần xác thực).' })
  @Post('bystander')
  createBystander(@Body() dto: BystanderSosDto) {
    return this.sosService.create({
      userId: dto.userId,
      triggerSource: SosTriggerSource.QR,
      note: dto.note,
    } as CreateSosDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tạo mới một sự cố SOS.' })
  @Post()
  create(@Body() createSosDto: CreateSosDto) {
    return this.sosService.create(createSosDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy danh sách sự cố SOS theo bộ lọc.' })
  @ApiQuery({ name: 'userId', required: false, description: 'UUID người dùng.' })
  @ApiQuery({ name: 'status', required: false, enum: SosStatus })
  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('status', new ParseEnumPipe(SosStatus, { optional: true })) status?: SosStatus,
  ) {
    return this.sosService.findAll({ userId, status });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy sự cố SOS đang mở/đã tiếp nhận mới nhất theo userId.' })
  @ApiParam({ name: 'userId', description: 'UUID người dùng.' })
  @Get('active/:userId')
  findActiveByUser(@Param('userId') userId: string) {
    return this.sosService.findActiveByUser(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy chi tiết sự cố SOS theo id.' })
  @ApiParam({ name: 'id', description: 'ID số nguyên của sự cố.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sự cố SOS.' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sosService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cập nhật trạng thái/thông tin sự cố SOS.' })
  @ApiParam({ name: 'id', description: 'ID số nguyên của sự cố.' })
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSosDto: UpdateSosDto) {
    return this.sosService.update(id, updateSosDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Xóa một sự cố SOS theo id.' })
  @ApiParam({ name: 'id', description: 'ID số nguyên của sự cố.' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.sosService.remove(id);
  }
}
