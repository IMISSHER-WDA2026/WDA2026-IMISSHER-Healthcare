import { NotificationType } from '../dto/create-notification.dto';

export class Notification {
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
