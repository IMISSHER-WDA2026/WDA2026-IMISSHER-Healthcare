import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsumeMedicineDto } from './dto/consume-medicine.dto';
import { MedicinesService } from './medicines.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';

@ApiTags('Medicines')
@Controller('medicines')
export class MedicinesController {
  constructor(private readonly service: MedicinesService) {}

  @Post()
  @ApiOperation({ summary: 'Thêm thuốc mới vào danh sách của người dùng' })
  create(@Body() dto: CreateMedicineDto) { return this.service.create(dto); }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thuốc' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một thuốc' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật toàn bộ thuốc' })
  update(@Param('id') id: string, @Body() dto: UpdateMedicineDto) { return this.service.update(id, dto); }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật một phần thuốc' })
  patch(@Param('id') id: string, @Body() dto: UpdateMedicineDto) { return this.service.update(id, dto); }

  @Post('consume/:id')
  @ApiOperation({ summary: 'Trừ số lượng thuốc đã sử dụng' })
  consume(@Param('id') id: string, @Body() dto: ConsumeMedicineDto) { return this.service.consume(id, dto); }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa thuốc' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}