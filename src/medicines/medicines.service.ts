import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicineMetadata } from './medicine-metadata.entity';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { ConsumeMedicineDto } from './dto/consume-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { UserMedicine } from './medicines.entity';

@Injectable()
export class MedicinesService {
  private readonly logger = new Logger(MedicinesService.name);

  constructor(
    @InjectRepository(UserMedicine)
    private readonly repo: Repository<UserMedicine>,
    @InjectRepository(MedicineMetadata)
    private readonly medicineMetadataRepo: Repository<MedicineMetadata>,
  ) {}

  private async resolveMedicineId(input: { medicine_id?: string; name?: string }): Promise<string> {
    if (input.medicine_id) {
      return input.medicine_id;
    }

    if (!input.name) {
      throw new BadRequestException('Cần cung cấp medicine_id hoặc name');
    }

    const trimmedName = input.name.trim();
    let metadata = await this.medicineMetadataRepo
      .createQueryBuilder('metadata')
      .where('LOWER(metadata.name) = LOWER(:name)', { name: trimmedName })
      .getOne();

    if (!metadata) {
      metadata = this.medicineMetadataRepo.create({ name: trimmedName });
      metadata = await this.medicineMetadataRepo.save(metadata);
    }

    return metadata.id;
  }

  private async findOneEntity(id: string): Promise<UserMedicine> {
    const medicine = await this.repo.findOne({ where: { id } });

    if (!medicine) {
      throw new NotFoundException('Không tìm thấy thuốc trong danh sách của người dùng');
    }

    return medicine;
  }

  private async toResponse(medicine: UserMedicine) {
    const row = await this.repo
      .createQueryBuilder('medicine')
      .leftJoin('medicines_metadata', 'metadata', 'metadata.id = medicine.medicine_id')
      .select([
        'medicine.id AS id',
        'medicine.user_id AS user_id',
        'medicine.medicine_id AS medicine_id',
        'metadata.name AS medicine_name',
        'medicine.quantity AS quantity',
        'medicine.expiry_date AS expiry_date',
        'medicine.custom_note AS custom_note',
        'medicine.added_at AS added_at',
      ])
      .where('medicine.id = :id', { id: medicine.id })
      .getRawOne();

    return row ?? medicine;
  }

  async create(dto: CreateMedicineDto) {
    const medicineId = await this.resolveMedicineId(dto);
    const newRecord = this.repo.create();
    newRecord.user_id = dto.user_id;
    newRecord.medicine_id = medicineId;
    newRecord.quantity = dto.quantity ?? 1;
    newRecord.expiry_date = dto.expiry_date ?? null;
    newRecord.custom_note = dto.custom_note ?? null;

    const saved = await this.repo.save(newRecord);
    return this.toResponse(saved);
  }

  async findAll() {
    return this.repo
      .createQueryBuilder('medicine')
      .leftJoin('medicines_metadata', 'metadata', 'metadata.id = medicine.medicine_id')
      .select([
        'medicine.id AS id',
        'medicine.user_id AS user_id',
        'medicine.medicine_id AS medicine_id',
        'metadata.name AS medicine_name',
        'medicine.quantity AS quantity',
        'medicine.expiry_date AS expiry_date',
        'medicine.custom_note AS custom_note',
        'medicine.added_at AS added_at',
      ])
      .orderBy('medicine.added_at', 'DESC')
      .getRawMany();
  }

  async findOne(id: string) {
    const medicine = await this.findOneEntity(id);
    return this.toResponse(medicine);
  }

  async update(id: string, dto: UpdateMedicineDto) {
    const medicine = await this.findOneEntity(id);

    if (dto.user_id) {
      medicine.user_id = dto.user_id;
    }

    if (dto.medicine_id || dto.name) {
      medicine.medicine_id = await this.resolveMedicineId(dto);
    }

    if (dto.quantity !== undefined) {
      medicine.quantity = dto.quantity;
    }

    if (dto.expiry_date !== undefined) {
      medicine.expiry_date = dto.expiry_date;
    }

    if (dto.custom_note !== undefined) {
      medicine.custom_note = dto.custom_note;
    }

    const saved = await this.repo.save(medicine);
    return this.toResponse(saved);
  }

  async remove(id: string) {
    const medicine = await this.findOneEntity(id);
    await this.repo.remove(medicine);
    return { message: 'Xóa thuốc thành công', id };
  }

  async consume(id: string, dto: ConsumeMedicineDto) {
    const medicine = await this.findOneEntity(id);

    if (medicine.quantity < dto.amount) {
      throw new BadRequestException('Cảnh báo: Không đủ thuốc!');
    }

    medicine.quantity -= dto.amount;
    const saved = await this.repo.save(medicine);

    if (saved.quantity <= 2) {
      this.logger.warn('TRIGGER: Cảnh báo sắp hết thuốc');
    }

    return this.toResponse(saved);
  }
}