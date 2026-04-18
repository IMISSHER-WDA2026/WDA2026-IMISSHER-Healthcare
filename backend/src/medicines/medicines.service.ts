import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JsonPersistenceStore } from '../common/persistence/json-persistence.store';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';

export interface MedicineMetadata {
  name: string;
  active_ingredient: string;
  barcode: string;
  description: string;
  contraindications: string;
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
  private readonly customMedicines = new Map<number, CustomMedicineRecord>();
  private readonly customIndexByBarcode = new Map<string, number>();
  private nextCustomMedicineId: number;
  private readonly customStore = new JsonPersistenceStore<CustomMedicineRecord>(
    'custom-medicines.json',
  );

  constructor() {
    this.loadMedicineCatalog();
    this.loadCustomMedicines();
  }

  create(createMedicineDto: CreateMedicineDto): CustomMedicineRecord {
    const barcode = createMedicineDto.barcode?.trim() ?? '';
    if (barcode && this.findByBarcode(barcode)) {
      throw new ConflictException('A medicine with this barcode already exists.');
    }

    const now = new Date().toISOString();
    const record: CustomMedicineRecord = {
      id: this.nextCustomMedicineId,
      source: 'custom',
      name: createMedicineDto.name,
      active_ingredient: createMedicineDto.active_ingredient ?? '',
      barcode,
      description: createMedicineDto.description ?? '',
      contraindications: createMedicineDto.contraindications ?? '',
      createdAt: now,
      updatedAt: now,
    };

    this.customMedicines.set(record.id, record);
    this.nextCustomMedicineId += 1;

    if (record.barcode) {
      this.customIndexByBarcode.set(record.barcode, record.id);
    }

    this.persistCustomMedicines();
    return record;
  }

  findAll(): MedicineMetadata[] {
    return [...this.catalogMedicines, ...Array.from(this.customMedicines.values())];
  }

  findOne(id: number): CustomMedicineRecord {
    const record = this.customMedicines.get(id);
    if (!record) {
      throw new NotFoundException(`Custom medicine #${id} not found.`);
    }

    return record;
  }

  findByBarcode(barcode: string): MedicineMetadata | null {
    const normalized = barcode.trim();
    if (!normalized) {
      return null;
    }

    const customId = this.customIndexByBarcode.get(normalized);
    if (customId) {
      return this.customMedicines.get(customId) ?? null;
    }

    return this.catalogIndexByBarcode.get(normalized) ?? null;
  }

  update(id: number, updateMedicineDto: UpdateMedicineDto): CustomMedicineRecord {
    const existing = this.findOne(id);
    const nextBarcode = updateMedicineDto.barcode?.trim() ?? existing.barcode;

    if (nextBarcode && nextBarcode !== existing.barcode) {
      const barcodeCollision = this.findByBarcode(nextBarcode);
      if (barcodeCollision) {
        throw new ConflictException('A medicine with this barcode already exists.');
      }
    }

    const updated: CustomMedicineRecord = {
      ...existing,
      ...updateMedicineDto,
      barcode: nextBarcode,
      updatedAt: new Date().toISOString(),
    };

    if (existing.barcode && existing.barcode !== updated.barcode) {
      this.customIndexByBarcode.delete(existing.barcode);
    }
    if (updated.barcode) {
      this.customIndexByBarcode.set(updated.barcode, updated.id);
    }

    this.customMedicines.set(id, updated);
    this.persistCustomMedicines();
    return updated;
  }

  remove(id: number): { deleted: true } {
    const existing = this.findOne(id);

    if (existing.barcode) {
      this.customIndexByBarcode.delete(existing.barcode);
    }

    this.customMedicines.delete(id);
    this.persistCustomMedicines();
    return { deleted: true };
  }

  private loadMedicineCatalog() {
    const filePath = this.resolveDataFile('Du_lieu_tu_thuoc_IMISSHER.csv');
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
    const candidates = [
      resolve(process.cwd(), '../ai/data', fileName),
      resolve(process.cwd(), 'ai/data', fileName),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private loadCustomMedicines() {
    const persistedCustomMedicines = this.customStore.load();

    for (const medicine of persistedCustomMedicines) {
      this.customMedicines.set(medicine.id, medicine);

      if (medicine.barcode) {
        this.customIndexByBarcode.set(medicine.barcode, medicine.id);
      }
    }

    this.nextCustomMedicineId = this.customStore.nextId(persistedCustomMedicines);
  }

  private persistCustomMedicines() {
    this.customStore.save(Array.from(this.customMedicines.values()));
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
}
