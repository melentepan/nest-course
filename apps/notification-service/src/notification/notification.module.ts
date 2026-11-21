import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MetricsModule } from '../providers/metrics/metrics.module';
import { NotificationAuthGuard } from './guards/notificationAuth.guard';
import { TransferEventsController } from './kafka/transferEvents.controller';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';
import { RejectedTransfersRepository } from './rejectedTransfers.repository';
import {
  RejectedTransfer,
  RejectedTransferSchema,
} from './schemas/rejectedTransfer.schema';
import {
  TransferNotification,
  TransferNotificationSchema,
} from './schemas/transferNotification.schema';

@Module({
  imports: [
    MetricsModule,
    MongooseModule.forFeature([
      { name: RejectedTransfer.name, schema: RejectedTransferSchema },
      { name: TransferNotification.name, schema: TransferNotificationSchema },
    ]),
  ],
  controllers: [NotificationController, TransferEventsController],
  providers: [
    NotificationRepository,
    RejectedTransfersRepository,
    NotificationGateway,
    NotificationService,
    NotificationAuthGuard,
  ],
})
export class NotificationModule {}
