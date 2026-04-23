import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Repository } from 'typeorm';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { Medicine } from './entities/medicine.entity';

export interface MedicineMetadata {
  name: string;
  active_ingredient: string;
  barcode: string;
  description: string;
  contraindications: string;
  source?: 'catalog' | 'custom';
  ownerId?: string;
  quantity?: number;
  unit?: string;
  expiresAt?: string;
  reminderTime?: string;
}

export interface CustomMedicineRecord extends MedicineMetadata {
  id: number;
  source: 'custom';
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class MedicinesService {
  private readonly catalogMedicines: MedicineMetadata[] = [];
  private readonly catalogIndexByBarcode = new Map<string, MedicineMetadata>();

  constructor(
    @InjectRepository(Medicine)
    private readonly customMedicineRepository: Repository<Medicine>,
  ) {
    this.loadMedicineCatalog();
  }

  async create(
    currentUserId: string,
    createMedicineDto: CreateMedicineDto,
  ): Promise<CustomMedicineRecord> {
    const name = createMedicineDto.name.trim();
    if (!name) {
      throw new BadRequestException('Medicine name is required.');
    }

    const barcode = createMedicineDto.barcode?.trim() ?? '';
    if (barcode) {
      const existingOwned = await this.customMedicineRepository.findOne({
        where: { barcode, ownerId: currentUserId },
      });
      if (existingOwned) {
        throw new ConflictException('A medicine with this barcode already exists.');
      }
    }

    const record = this.customMedicineRepository.create({
      source: 'custom',
      name,
      active_ingredient: this.normalizeOptionalText(createMedicineDto.active_ingredient),
      barcode,
      description: this.normalizeOptionalText(createMedicineDto.description),
      contraindications: this.normalizeOptionalText(createMedicineDto.contraindications),
      ownerId: currentUserId,
      quantity: this.normalizeOptionalNumber(createMedicineDto.quantity),
      unit: this.normalizeOptionalText(createMedicineDto.unit),
      expiresAt: this.normalizeOptionalText(createMedicineDto.expiresAt),
      reminderTime: this.normalizeOptionalText(createMedicineDto.reminderTime),
    });

    const savedRecord = await this.customMedicineRepository.save(record);
    return this.toCustomMedicineRecord(savedRecord);
  }

  async findAll(
    currentUserId: string,
    options?: { mineOnly?: boolean },
  ): Promise<MedicineMetadata[]> {
    const customMedicineEntities = await this.customMedicineRepository.find({
      where: { ownerId: currentUserId },
      order: { createdAt: 'DESC' },
    });

    const customMedicines = customMedicineEntities.map((record) =>
      this.toCustomMedicineRecord(record),
    );

    if (options?.mineOnly) {
      return customMedicines;
    }

    return [...this.catalogMedicines, ...customMedicines];
  }

  async findOne(currentUserId: string, id: number): Promise<CustomMedicineRecord> {
    const record = await this.customMedicineRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Custom medicine #${id} not found.`);
    }

    this.assertOwnership(record, currentUserId);
    return this.toCustomMedicineRecord(record);
  }

  async findByBarcode(
    barcode: string,
    currentUserId?: string,
  ): Promise<MedicineMetadata | null> {
    const normalized = barcode.trim();
    if (!normalized) {
      return null;
    }

    if (currentUserId) {
      const ownedCustom = await this.customMedicineRepository.findOne({
        where: { barcode: normalized, ownerId: currentUserId },
      });

      if (ownedCustom) {
        return this.toCustomMedicineRecord(ownedCustom);
      }
    }

    return this.catalogIndexByBarcode.get(normalized) ?? null;
  }

  async update(
    currentUserId: string,
    id: number,
    updateMedicineDto: UpdateMedicineDto,
  ): Promise<CustomMedicineRecord> {
    const existing = await this.customMedicineRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Custom medicine #${id} not found.`);
    }

    this.assertOwnership(existing, currentUserId);

    const nextName = updateMedicineDto.name?.trim() ?? existing.name;
    if (!nextName) {
      throw new BadRequestException('Medicine name is required.');
    }

    const nextBarcode = updateMedicineDto.barcode?.trim() ?? existing.barcode;

    if (nextBarcode && nextBarcode !== existing.barcode) {
      const barcodeCollision = await this.customMedicineRepository.findOne({
        where: { barcode: nextBarcode, ownerId: currentUserId },
      });
      if (barcodeCollision && barcodeCollision.id !== existing.id) {
        throw new ConflictException('A medicine with this barcode already exists.');
      }
    }

    const updated: Medicine = {
      ...existing,
      name: nextName,
      active_ingredient:
        updateMedicineDto.active_ingredient?.trim() ?? existing.active_ingredient,
      barcode: nextBarcode,
      description: updateMedicineDto.description?.trim() ?? existing.description,
      contraindications:
        updateMedicineDto.contraindications?.trim() ?? existing.contraindications,
      ownerId: existing.ownerId,
      quantity: updateMedicineDto.quantity ?? existing.quantity,
      unit: updateMedicineDto.unit?.trim() ?? existing.unit,
      expiresAt: updateMedicineDto.expiresAt?.trim() ?? existing.expiresAt,
      reminderTime: updateMedicineDto.reminderTime?.trim() ?? existing.reminderTime,
    };

    const savedRecord = await this.customMedicineRepository.save(updated);
    return this.toCustomMedicineRecord(savedRecord);
  }

  async remove(currentUserId: string, id: number): Promise<{ deleted: true }> {
    const existing = await this.customMedicineRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Custom medicine #${id} not found.`);
    }

    this.assertOwnership(existing, currentUserId);

    await this.customMedicineRepository.delete({ id });
    return { deleted: true };
  }

  private assertOwnership(record: Medicine, currentUserId: string): void {
    if (!record.ownerId || record.ownerId !== currentUserId) {
      throw new ForbiddenException(
        'You do not have permission to access this medicine.',
      );
    }
  }

  private loadMedicineCatalog() {
    const filePath = this.resolveDataFile('healthcare_medicine_catalog.csv');
    if (!filePath) {
      return;
    }

    const csvText = readFileSync(filePath, 'utf8');
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);

    for (let i = 1; i < lines.length; i += 1) {
      const cells = this.parseCsvLine(lines[i]);
      if (cells.length < 5) {
        continue;
      }

      const medicine: MedicineMetadata = {
        source: 'catalog',
        name: cells[0].trim(),
        active_ingredient: cells[1].trim(),
        barcode: cells[2].trim(),
        description: cells[3].trim(),
        contraindications: cells[4].trim(),
      };

      if (medicine.barcode) {
        this.catalogMedicines.push(medicine);
        this.catalogIndexByBarcode.set(medicine.barcode, medicine);
      }
    }
  }

  private resolveDataFile(fileName: string): string | null {
    const configuredDataDir = process.env.HEALTHCARE_MEDICINE_DATA_DIR?.trim();
    const candidates = [
      configuredDataDir ? resolve(configuredDataDir, fileName) : null,
      resolve(process.cwd(), '../ai/data', fileName),
      resolve(process.cwd(), 'ai/data', fileName),
      resolve('/opt/healthcare-ai-data', fileName),
    ];

    for (const candidate of candidates) {
      if (candidate && existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private toCustomMedicineRecord(medicine: Medicine): CustomMedicineRecord {
    return {
      id: medicine.id,
      source: 'custom',
      name: medicine.name,
      active_ingredient: this.normalizeOptionalText(medicine.active_ingredient),
      barcode: this.normalizeOptionalText(medicine.barcode),
      description: this.normalizeOptionalText(medicine.description),
      contraindications: this.normalizeOptionalText(medicine.contraindications),
      ownerId: this.normalizeOptionalText(medicine.ownerId),
      quantity: this.normalizeOptionalNumber(medicine.quantity ?? undefined),
      unit: this.normalizeOptionalText(medicine.unit),
      expiresAt: this.normalizeOptionalText(medicine.expiresAt),
      reminderTime: this.normalizeOptionalText(medicine.reminderTime),
      createdAt: medicine.createdAt.toISOString(),
      updatedAt: medicine.updatedAt.toISOString(),
    };
  }

  private parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        cells.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    cells.push(current);
    return cells;
  }

  private normalizeOptionalText(value?: string | null): string {
    return value?.trim() ?? '';
  }

  private normalizeOptionalNumber(value?: number): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : undefined;
  }
}
