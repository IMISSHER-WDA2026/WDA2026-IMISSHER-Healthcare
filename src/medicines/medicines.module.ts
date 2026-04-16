import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicinesController } from './medicines.controller';
import { MedicineMetadata } from './medicine-metadata.entity';
import { UserMedicine } from './medicines.entity';
import { MedicinesService } from './medicines.service';

@Module({
	imports: [TypeOrmModule.forFeature([UserMedicine, MedicineMetadata])],
	controllers: [MedicinesController],
	providers: [MedicinesService],
})
export class MedicinesModule {}
