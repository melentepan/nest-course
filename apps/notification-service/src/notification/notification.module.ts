import { TransferEventsController } from './kafka/transferEvents.controller';
import { Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationAuthGuard } from './guards/notificationAuth.guard';

@Module({
  controllers: [NotificationController, TransferEventsController],
  providers: [NotificationGateway, NotificationService, NotificationAuthGuard],
})
export class NotificationModule {}
