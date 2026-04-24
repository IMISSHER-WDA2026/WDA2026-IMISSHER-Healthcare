import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SosService } from './sos.service';
import { SosController } from './sos.controller';
import { SosRecord } from './entities/sos-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SosRecord])],
  controllers: [SosController],
  providers: [SosService],
})
export class SosModule {}
