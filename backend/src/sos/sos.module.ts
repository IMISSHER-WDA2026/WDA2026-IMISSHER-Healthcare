import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SosController } from './sos.controller';
import { SosProfile } from './entities/sos-profile.entity';
import { SosService } from './sos.service';

@Module({
	imports: [TypeOrmModule.forFeature([SosProfile])],
	controllers: [SosController],
	providers: [SosService],
})
export class SosModule {}
