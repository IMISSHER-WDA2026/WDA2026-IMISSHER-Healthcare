import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SosResponseDto } from './dto/sos-response.dto';
import { SosProfile } from './entities/sos-profile.entity';

@Injectable()
export class SosService {
	constructor(
		@InjectRepository(SosProfile)
		private readonly sosProfileRepo: Repository<SosProfile>,
	) {}

	async getSos(): Promise<SosResponseDto> {
		const row = await this.sosProfileRepo
			.createQueryBuilder('sos')
			.innerJoin('profiles', 'profile', 'profile.id = sos.user_id')
			.select([
				'profile.full_name AS full_name',
				'sos.blood_type AS blood_type',
				'sos.allergies AS allergies',
				'COALESCE(sos.emergency_phone, profile.phone_number) AS emergency_contact',
			])
			.orderBy('sos.updated_at', 'DESC')
			.getRawOne<SosResponseDto>();

		if (!row) {
			throw new NotFoundException('Không tìm thấy thông tin SOS');
		}

		return row;
	}
}
