import { Injectable, NotFoundException } from '@nestjs/common';
import { JsonPersistenceStore } from '../common/persistence/json-persistence.store';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationType } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

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
  private readonly records = new Map<number, NotificationRecord>();
  private nextNotificationId: number;
  private readonly store = new JsonPersistenceStore<NotificationRecord>('notifications.json');

  constructor() {
    const persistedRecords = this.store.load();
    for (const record of persistedRecords) {
      this.records.set(record.id, record);
    }

    this.nextNotificationId = this.store.nextId(persistedRecords);
  }

  create(createNotificationDto: CreateNotificationDto): NotificationRecord {
    const now = new Date().toISOString();
    const isRead = createNotificationDto.isRead ?? false;

    const record: NotificationRecord = {
      id: this.nextNotificationId,
      userId: createNotificationDto.userId,
      title: createNotificationDto.title,
      message: createNotificationDto.message,
      type: createNotificationDto.type ?? NotificationType.INFO,
      isRead,
      readAt: isRead ? now : undefined,
      metadata: createNotificationDto.metadata,
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(record.id, record);
    this.nextNotificationId += 1;
    this.persist();
    return record;
  }

  findAll(filters: NotificationFilters = {}): NotificationRecord[] {
    const records = Array.from(this.records.values())
      .filter((record) => {
        if (filters.userId && record.userId !== filters.userId) {
          return false;
        }

        if (filters.isRead !== undefined && record.isRead !== filters.isRead) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (filters.limit && filters.limit > 0) {
      return records.slice(0, filters.limit);
    }

    return records;
  }

  findOne(id: number): NotificationRecord {
    const record = this.records.get(id);
    if (!record) {
      throw new NotFoundException(`Notification #${id} not found.`);
    }

    return record;
  }

  update(id: number, updateNotificationDto: UpdateNotificationDto): NotificationRecord {
    const existing = this.findOne(id);
    const { id: ignoredId, ...changes } = updateNotificationDto;
    void ignoredId;

    const nextIsRead = changes.isRead ?? existing.isRead;
    const nextReadAt = nextIsRead
      ? existing.readAt ?? new Date().toISOString()
      : undefined;

    const updated: NotificationRecord = {
      ...existing,
      ...changes,
      isRead: nextIsRead,
      readAt: nextReadAt,
      updatedAt: new Date().toISOString(),
    };

    this.records.set(id, updated);
    this.persist();
    return updated;
  }

  markAsRead(id: number, isRead = true): NotificationRecord {
    return this.update(id, { isRead });
  }

  remove(id: number): { deleted: true } {
    this.findOne(id);
    this.records.delete(id);
    this.persist();
    return { deleted: true };
  }

  private persist() {
    this.store.save(Array.from(this.records.values()));
  }
}
