import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
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
  private readonly logger = new Logger(SosService.name);

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

    const resolvedAtSource =
      nextStatus === SosStatus.RESOLVED
        ? (updateSosDto.resolvedAt ??
          incident.resolvedAt?.toISOString() ??
          new Date().toISOString())
        : (updateSosDto.resolvedAt ?? incident.resolvedAt);

    const patch: Partial<SosRecord> = {};
    if (updateSosDto.triggerSource !== undefined)
      patch.triggerSource = updateSosDto.triggerSource;
    if (updateSosDto.latitude !== undefined)
      patch.latitude = updateSosDto.latitude;
    if (updateSosDto.longitude !== undefined)
      patch.longitude = updateSosDto.longitude;
    if (updateSosDto.note !== undefined) patch.note = updateSosDto.note;
    if (updateSosDto.responderPhone !== undefined)
      patch.responderPhone = updateSosDto.responderPhone;
    if (updateSosDto.resolutionNote !== undefined)
      patch.resolutionNote = updateSosDto.resolutionNote;

    const updated: SosRecord = {
      ...incident,
      ...patch,
      status: nextStatus,
      resolvedAt: resolvedAtSource
        ? resolvedAtSource instanceof Date
          ? resolvedAtSource
          : new Date(resolvedAtSource)
        : null,
    };

    try {
      const saved = await this.sosRepository.save(updated);
      return this.toEntity(saved);
    } catch (error) {
      this.logger.error(
        `Failed to persist SOS update for incident #${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Unable to update SOS incident. Please retry shortly.',
      );
    }
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
