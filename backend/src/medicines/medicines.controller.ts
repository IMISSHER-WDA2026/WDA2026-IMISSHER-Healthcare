import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthTokenPayload } from '../auth/interfaces/auth-payload.interface';
import { MedicineMetadata, MedicinesService } from './medicines.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';

type AuthenticatedRequest = Request & { user: AuthTokenPayload };

@ApiTags('Medicines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('medicines')
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @ApiOperation({ summary: 'Tạo thuốc tùy chỉnh trong kho thuốc người dùng.' })
  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createMedicineDto: CreateMedicineDto,
  ) {
    return this.medicinesService.create(req.user.sub, createMedicineDto);
  }

  @ApiOperation({
    summary:
      'Lấy danh sách thuốc từ catalog + thuốc tùy chỉnh của chính người dùng.',
  })
  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('mineOnly') mineOnlyRaw?: string,
  ): Promise<MedicineMetadata[]> {
    const mineOnly = mineOnlyRaw === 'true';
    return this.medicinesService.findAll(req.user.sub, { mineOnly });
  }

  @ApiOperation({ summary: 'Tra cứu metadata thuốc theo mã vạch.' })
  @ApiParam({ name: 'barcode', description: 'Mã vạch thuốc.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy metadata mã vạch.' })
  @Get('barcode/:barcode')
  async findByBarcode(
    @Req() req: AuthenticatedRequest,
    @Param('barcode') barcode: string,
  ): Promise<MedicineMetadata> {
    const medicine = await this.medicinesService.findByBarcode(
      barcode,
      req.user.sub,
    );
    if (!medicine) {
      throw new NotFoundException('Medicine metadata not found for barcode.');
    }

    return medicine;
  }

  @ApiOperation({
    summary: 'Lấy chi tiết một thuốc tùy chỉnh của người dùng hiện tại.',
  })
  @ApiParam({ name: 'id', description: 'ID số nguyên của thuốc tùy chỉnh.' })
  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.medicinesService.findOne(req.user.sub, id);
  }

  @ApiOperation({
    summary: 'Cập nhật một thuốc tùy chỉnh của người dùng hiện tại.',
  })
  @ApiParam({ name: 'id', description: 'ID số nguyên của thuốc tùy chỉnh.' })
  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMedicineDto: UpdateMedicineDto,
  ) {
    return this.medicinesService.update(req.user.sub, id, updateMedicineDto);
  }

  @ApiOperation({ summary: 'Xóa một thuốc tùy chỉnh của người dùng hiện tại.' })
  @ApiParam({ name: 'id', description: 'ID số nguyên của thuốc tùy chỉnh.' })
  @Delete(':id')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.medicinesService.remove(req.user.sub, id);
  }
}
