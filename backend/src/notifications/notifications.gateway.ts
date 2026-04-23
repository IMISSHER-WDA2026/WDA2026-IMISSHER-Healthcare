import { BadRequestException } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly notificationsService: NotificationsService) { }

  @SubscribeMessage('createNotification')
  async create(@MessageBody() createNotificationDto: CreateNotificationDto) {
    const notification = await this.notificationsService.create(createNotificationDto);
    this.emitEvent('notification.created', notification);
    return notification;
  }

  @SubscribeMessage('findAllNotifications')
  async findAll(
    @MessageBody()
    filters?: {
      userId?: string;
      isRead?: boolean;
      limit?: number;
    },
  ) {
    return this.notificationsService.findAll(filters);
  }

  @SubscribeMessage('findOneNotification')
  async findOne(@MessageBody() id: number) {
    return this.notificationsService.findOne(id);
  }

  @SubscribeMessage('updateNotification')
  async update(@MessageBody() updateNotificationDto: UpdateNotificationDto) {
    if (!updateNotificationDto.id) {
      throw new BadRequestException('id is required for updateNotification event.');
    }

    const notification = await this.notificationsService.update(
      updateNotificationDto.id,
      updateNotificationDto,
    );
    this.emitEvent('notification.updated', notification);
    return notification;
  }

  @SubscribeMessage('removeNotification')
  async remove(@MessageBody() id: number) {
    const result = await this.notificationsService.remove(id);
    this.server.emit('notification.removed', { id });
    return result;
  }

  @SubscribeMessage('markNotificationRead')
  async markRead(
    @MessageBody() payload: { id: number; isRead?: boolean },
  ) {
    if (!payload?.id) {
      throw new BadRequestException('id is required for markNotificationRead event.');
    }

    const notification = await this.notificationsService.markAsRead(
      payload.id,
      payload.isRead ?? true,
    );
    this.emitEvent('notification.updated', notification);
    return notification;
  }

  private emitEvent(eventName: string, payload: { userId?: string }) {
    this.server.emit(eventName, payload);

    if (payload.userId) {
      this.server.emit(`${eventName}.user.${payload.userId}`, payload);
    }
  }
}
