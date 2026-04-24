import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationType } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Notification } from './entities/notification.entity';

export interface NotificationRecord {
  id: number;
  userId?: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  readAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface NotificationFilters {
  userId?: string;
  isRead?: boolean;
  limit?: number;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationRecord> {
    const now = new Date().toISOString();
    const isRead = createNotificationDto.isRead ?? false;

    const record = this.notificationsRepository.create({
      userId: createNotificationDto.userId,
      title: createNotificationDto.title,
      message: createNotificationDto.message,
      type: createNotificationDto.type ?? NotificationType.INFO,
      isRead,
      readAt: isRead ? new Date(now) : null,
      metadata: createNotificationDto.metadata ?? null,
    });

    const savedRecord = await this.notificationsRepository.save(record);
    return this.toRecord(savedRecord);
  }

  async findAll(
    filters: NotificationFilters = {},
  ): Promise<NotificationRecord[]> {
    const query =
      this.notificationsRepository.createQueryBuilder('notification');

    if (filters.userId) {
      query.andWhere('notification.userId = :userId', {
        userId: filters.userId,
      });
    }

    if (filters.isRead !== undefined) {
      query.andWhere('notification.isRead = :isRead', {
        isRead: filters.isRead,
      });
    }

    query.orderBy('notification.createdAt', 'DESC');

    if (filters.limit && filters.limit > 0) {
      query.take(filters.limit);
    }

    const records = await query.getMany();
    return records.map((record) => this.toRecord(record));
  }

  async findOne(id: number): Promise<NotificationRecord> {
    const record = await this.notificationsRepository.findOne({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(`Notification #${id} not found.`);
    }

    return this.toRecord(record);
  }

  async update(
    id: number,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<NotificationRecord> {
    const existing = await this.notificationsRepository.findOne({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Notification #${id} not found.`);
    }

    const { id: ignoredId, ...changes } = updateNotificationDto;
    void ignoredId;

    existing.userId = changes.userId ?? existing.userId;
    existing.title = changes.title ?? existing.title;
    existing.message = changes.message ?? existing.message;
    existing.type = changes.type ?? existing.type;
    existing.metadata = changes.metadata ?? existing.metadata;

    if (changes.isRead !== undefined) {
      existing.isRead = changes.isRead;
      existing.readAt = changes.isRead ? (existing.readAt ?? new Date()) : null;
    }

    const savedRecord = await this.notificationsRepository.save(existing);
    return this.toRecord(savedRecord);
  }

  async markAsRead(id: number, isRead = true): Promise<NotificationRecord> {
    return this.update(id, { isRead });
  }

  async remove(id: number): Promise<{ deleted: true }> {
    await this.findOne(id);
    await this.notificationsRepository.delete({ id });
    return { deleted: true };
  }

  private toRecord(record: Notification): NotificationRecord {
    return {
      id: record.id,
      userId: record.userId ?? undefined,
      title: record.title,
      message: record.message,
      type: record.type,
      isRead: record.isRead,
      readAt: record.readAt?.toISOString(),
      metadata: record.metadata ?? undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
