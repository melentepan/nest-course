import { Injectable } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(private readonly gateway: NotificationGateway) {}

  sendTestNotification(userId: number): void {
    this.gateway.sendNotification(userId, {
      message: 'Тестовое уведомление',
    });
  }
}
