import { Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';

import { NotificationAuthGuard } from './guards/notificationAuth.guard';
import type { NotificationRequest } from './interfaces/notificationRequest.interface';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(NotificationAuthGuard)
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Post('test')
  @HttpCode(204)
  sendTest(@Req() request: NotificationRequest): void {
    this.service.sendTestNotification(request.user.sub);
  }
}
