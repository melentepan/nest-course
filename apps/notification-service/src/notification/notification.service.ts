import { Injectable } from '@nestjs/common';

import type { TransferCompletedEvent } from '@app/common';

import type { RejectedTransferInput } from './interfaces/rejectedTransfer.interface';
import { NotificationGateway } from './notification.gateway';
import { NotificationRepository } from './notification.repository';
import { RejectedTransfersRepository } from './rejectedTransfers.repository';

@Injectable()
export class NotificationService {
  constructor(
    private readonly gateway: NotificationGateway,
    private readonly repository: NotificationRepository,
    private readonly rejected: RejectedTransfersRepository,
  ) {}

  quarantine(input: RejectedTransferInput): Promise<void> {
    return this.rejected.save(input);
  }

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
