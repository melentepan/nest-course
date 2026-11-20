import { MetricsModule } from '../providers/metrics/metrics.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TransferNotification,
  TransferNotificationSchema,
} from './schemas/transferNotification.schema';
import { NotificationRepository } from './notification.repository';
import { TransferEventsController } from './kafka/transferEvents.controller';
import { Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationAuthGuard } from './guards/notificationAuth.guard';

@Module({
  imports: [
    MetricsModule,
    MongooseModule.forFeature([
      { name: TransferNotification.name, schema: TransferNotificationSchema },
    ]),
  ],
  controllers: [NotificationController, TransferEventsController],
  providers: [
    NotificationRepository,
    NotificationGateway,
    NotificationService,
    NotificationAuthGuard,
  ],
})
export class NotificationModule {}
