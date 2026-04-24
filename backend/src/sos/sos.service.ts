import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateSosDto } from './dto/create-sos.dto';
import { SosStatus, UpdateSosDto } from './dto/update-sos.dto';
import type { SosEntity } from './entities/sos.entity';
import { SosRecord } from './entities/sos-record.entity';

interface SosFilters {
  userId?: string;
  status?: SosStatus;
}

@Injectable()
export class SosService {
  constructor(
    @InjectRepository(SosRecord)
    private readonly sosRepository: Repository<SosRecord>,
  ) {}

  async create(createSosDto: CreateSosDto): Promise<SosEntity> {
    this.assertLocationConsistency(
      createSosDto.latitude,
      createSosDto.longitude,
    );

    const incident = this.sosRepository.create({
      userId: createSosDto.userId,
      triggerSource: createSosDto.triggerSource,
      status: SosStatus.OPEN,
      latitude: createSosDto.latitude,
      longitude: createSosDto.longitude,
      note: createSosDto.note,
      responderPhone: createSosDto.responderPhone,
    });

    const savedIncident = await this.sosRepository.save(incident);
    return this.toEntity(savedIncident);
  }

  async findAll(filters: SosFilters = {}): Promise<SosEntity[]> {
    const query = this.sosRepository.createQueryBuilder('incident');

    if (filters.userId) {
      query.andWhere('incident.userId = :userId', { userId: filters.userId });
    }

    if (filters.status) {
      query.andWhere('incident.status = :status', { status: filters.status });
    }

    const incidents = await query
      .orderBy('incident.createdAt', 'DESC')
      .getMany();
    return incidents.map((incident) => this.toEntity(incident));
  }

  async findActiveByUser(userId: string): Promise<SosEntity | null> {
    const incident = await this.sosRepository.findOne({
      where: {
        userId,
        status: In([SosStatus.OPEN, SosStatus.ACKNOWLEDGED]),
      },
      order: { createdAt: 'DESC' },
    });

    return incident ? this.toEntity(incident) : null;
  }

  async findOne(id: number): Promise<SosEntity> {
    const incident = await this.sosRepository.findOne({ where: { id } });
    if (!incident) {
      throw new NotFoundException(`SOS incident #${id} not found.`);
    }

    return this.toEntity(incident);
  }

  async update(id: number, updateSosDto: UpdateSosDto): Promise<SosEntity> {
    const incident = await this.sosRepository.findOne({ where: { id } });
    if (!incident) {
      throw new NotFoundException(`SOS incident #${id} not found.`);
    }

    this.assertLocationConsistency(
      updateSosDto.latitude,
      updateSosDto.longitude,
    );

    const nextStatus = updateSosDto.status ?? incident.status;

    if (nextStatus !== SosStatus.RESOLVED && updateSosDto.resolutionNote) {
      throw new BadRequestException(
        'resolutionNote can only be provided for resolved incidents.',
      );
    }

    const resolvedAt =
      nextStatus === SosStatus.RESOLVED
        ? (updateSosDto.resolvedAt ??
          incident.resolvedAt?.toISOString() ??
          new Date().toISOString())
        : (updateSosDto.resolvedAt ?? incident.resolvedAt);

    const updated: SosRecord = {
      ...incident,
      ...updateSosDto,
      status: nextStatus,
      resolvedAt: resolvedAt ? new Date(resolvedAt) : null,
    };

    const saved = await this.sosRepository.save(updated);
    return this.toEntity(saved);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    await this.findOne(id);
    await this.sosRepository.delete({ id });
    return { deleted: true };
  }

  private assertLocationConsistency(latitude?: number, longitude?: number) {
    if ((latitude === undefined) !== (longitude === undefined)) {
      throw new BadRequestException(
        'Both latitude and longitude must be provided together.',
      );
    }
  }

  private toEntity(record: SosRecord): SosEntity {
    return {
      id: record.id,
      userId: record.userId,
      triggerSource: record.triggerSource as CreateSosDto['triggerSource'],
      status: record.status as SosStatus,
      latitude: record.latitude ?? undefined,
      longitude: record.longitude ?? undefined,
      note: record.note ?? undefined,
      responderPhone: record.responderPhone ?? undefined,
      resolvedAt: record.resolvedAt?.toISOString(),
      resolutionNote: record.resolutionNote ?? undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
