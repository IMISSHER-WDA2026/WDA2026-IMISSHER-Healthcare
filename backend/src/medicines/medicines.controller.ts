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
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MedicineMetadata, MedicinesService } from './medicines.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';

@ApiTags('Medicines')
@Controller('medicines')
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) { }

  @ApiOperation({ summary: 'Tạo thuốc tùy chỉnh trong kho thuốc người dùng.' })
  @Post()
  create(@Body() createMedicineDto: CreateMedicineDto) {
    return this.medicinesService.create(createMedicineDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách thuốc từ catalog + thuốc tùy chỉnh.' })
  @Get()
  findAll(
    @Query('ownerId') ownerId?: string,
    @Query('mineOnly') mineOnlyRaw?: string,
  ): Promise<MedicineMetadata[]> {
    const mineOnly = mineOnlyRaw === 'true';
    return this.medicinesService.findAll({ ownerId, mineOnly });
  }

  @ApiOperation({ summary: 'Tra cứu metadata thuốc theo mã vạch.' })
  @ApiParam({ name: 'barcode', description: 'Mã vạch thuốc.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy metadata mã vạch.' })
  @Get('barcode/:barcode')
  async findByBarcode(@Param('barcode') barcode: string): Promise<MedicineMetadata> {
    const medicine = await this.medicinesService.findByBarcode(barcode);
    if (!medicine) {
      throw new NotFoundException('Medicine metadata not found for barcode.');
    }

    return medicine;
  }

  @ApiOperation({ summary: 'Lấy chi tiết một thuốc tùy chỉnh theo id.' })
  @ApiParam({ name: 'id', description: 'ID số nguyên của thuốc tùy chỉnh.' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.medicinesService.findOne(id);
  }

  @ApiOperation({ summary: 'Cập nhật một thuốc tùy chỉnh.' })
  @ApiParam({ name: 'id', description: 'ID số nguyên của thuốc tùy chỉnh.' })
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateMedicineDto: UpdateMedicineDto) {
    return this.medicinesService.update(id, updateMedicineDto);
  }

  @ApiOperation({ summary: 'Xóa một thuốc tùy chỉnh.' })
  @ApiParam({ name: 'id', description: 'ID số nguyên của thuốc tùy chỉnh.' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.medicinesService.remove(id);
  }
}
