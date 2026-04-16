import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SosService } from './sos.service';
import { CreateSoDto } from './dto/create-so.dto';
import { UpdateSoDto } from './dto/update-so.dto';

@Controller('sos')
export class SosController {
  constructor(private readonly sosService: SosService) {}

  @Post()
  create(@Body() createSoDto: CreateSoDto) {
    return this.sosService.create(createSoDto);
  }

  @Get()
  findAll() {
    return this.sosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSoDto: UpdateSoDto) {
    return this.sosService.update(+id, updateSoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sosService.remove(+id);
  }
}
