import type { TransferCompletedEvent } from '@app/common';
import { NotificationRepository } from './notification.repository';
import { Injectable } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private readonly gateway: NotificationGateway,
    private readonly repository: NotificationRepository,
  ) {}

  async handleTransfer(event: TransferCompletedEvent): Promise<void> {
    await this.repository.saveTransfer(event);
    this.gateway.sendNotification(event.fromUserId, event);
    this.gateway.sendNotification(event.toUserId, event);
  }

  sendTestNotification(userId: number): void {
    this.gateway.sendNotification(userId, {
      message: 'Тестовое уведомление',
    });
  }
}
