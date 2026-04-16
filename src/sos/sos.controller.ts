import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SosResponseDto } from './dto/sos-response.dto';
import { SosService } from './sos.service';

@ApiTags('SOS')
@Controller('sos')
export class SosController {
  constructor(private readonly sosService: SosService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy thông tin SOS của tôi' })
  @ApiOkResponse({ type: SosResponseDto })
  getSos() {
    return this.sosService.getSos();
  }
}