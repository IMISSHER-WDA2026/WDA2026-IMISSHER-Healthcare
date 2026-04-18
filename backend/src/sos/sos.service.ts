import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JsonPersistenceStore } from '../common/persistence/json-persistence.store';
import { CreateSosDto } from './dto/create-sos.dto';
import { SosStatus, UpdateSosDto } from './dto/update-sos.dto';
import type { SosEntity } from './entities/sos.entity';

interface SosFilters {
  userId?: string;
  status?: SosStatus;
}

@Injectable()
export class SosService {
  private readonly incidents = new Map<number, SosEntity>();
  private nextIncidentId: number;
  private readonly store = new JsonPersistenceStore<SosEntity>('sos-incidents.json');

  constructor() {
    const persistedIncidents = this.store.load();
    for (const incident of persistedIncidents) {
      this.incidents.set(incident.id, incident);
    }

    this.nextIncidentId = this.store.nextId(persistedIncidents);
  }

  create(createSosDto: CreateSosDto): SosEntity {
    this.assertLocationConsistency(createSosDto.latitude, createSosDto.longitude);

    const now = new Date().toISOString();
    const incident: SosEntity = {
      id: this.nextIncidentId,
      userId: createSosDto.userId,
      triggerSource: createSosDto.triggerSource,
      status: SosStatus.OPEN,
      latitude: createSosDto.latitude,
      longitude: createSosDto.longitude,
      note: createSosDto.note,
      responderPhone: createSosDto.responderPhone,
      createdAt: now,
      updatedAt: now,
    };

    this.incidents.set(incident.id, incident);
    this.nextIncidentId += 1;
    this.persist();
    return incident;
  }

  findAll(filters: SosFilters = {}): SosEntity[] {
    return Array.from(this.incidents.values())
      .filter((incident) => {
        if (filters.userId && incident.userId !== filters.userId) {
          return false;
        }

        if (filters.status && incident.status !== filters.status) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  findActiveByUser(userId: string): SosEntity | null {
    return (
      this.findAll({ userId }).find(
        (incident) => incident.status === SosStatus.OPEN || incident.status === SosStatus.ACKNOWLEDGED,
      ) ?? null
    );
  }

  findOne(id: number): SosEntity {
    const incident = this.incidents.get(id);
    if (!incident) {
      throw new NotFoundException(`SOS incident #${id} not found.`);
    }

    return incident;
  }

  update(id: number, updateSosDto: UpdateSosDto): SosEntity {
    const incident = this.findOne(id);
    this.assertLocationConsistency(updateSosDto.latitude, updateSosDto.longitude);

    const now = new Date().toISOString();
    const nextStatus = updateSosDto.status ?? incident.status;
    const resolvedAt =
      nextStatus === SosStatus.RESOLVED
        ? updateSosDto.resolvedAt ?? incident.resolvedAt ?? now
        : updateSosDto.resolvedAt ?? incident.resolvedAt;

    const updated: SosEntity = {
      ...incident,
      ...updateSosDto,
      status: nextStatus,
      resolvedAt,
      updatedAt: now,
    };

    if (updated.status !== SosStatus.RESOLVED && updateSosDto.resolutionNote) {
      throw new BadRequestException('resolutionNote can only be provided for resolved incidents.');
    }

    this.incidents.set(id, updated);
    this.persist();
    return updated;
  }

  remove(id: number): { deleted: true } {
    this.findOne(id);
    this.incidents.delete(id);
    this.persist();
    return { deleted: true };
  }

  private assertLocationConsistency(latitude?: number, longitude?: number) {
    if ((latitude === undefined) !== (longitude === undefined)) {
      throw new BadRequestException('Both latitude and longitude must be provided together.');
    }
  }

  private persist() {
    this.store.save(Array.from(this.incidents.values()));
  }
}
