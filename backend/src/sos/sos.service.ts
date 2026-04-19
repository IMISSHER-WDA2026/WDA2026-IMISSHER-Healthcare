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

	async getSos(userId: string): Promise<SosResponseDto> {
		if (!userId) {
			throw new NotFoundException('Vui lòng truyền user_id');
		}

		const sosProfile = await this.sosProfileRepo.findOne({
			where: { user_id: userId },
			relations: ['profile'],
			order: { updated_at: 'DESC' },
		});

		if (!sosProfile || !sosProfile.profile) {
			throw new NotFoundException('Không tìm thấy thông tin SOS');
		}

		return {
			full_name: sosProfile.profile.full_name,
			blood_type: sosProfile.blood_type,
			allergies: sosProfile.allergies,
			emergency_contact: sosProfile.emergency_phone || sosProfile.profile.phone_number,
		} as SosResponseDto;
	}
}
