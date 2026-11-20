import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  KafkaContext,
  KafkaRetriableException,
  Payload,
} from '@nestjs/microservices';
import {
  isTransferCompletedEvent,
  TRANSFER_COMPLETED_EVENT,
} from '@app/common';
import { NotificationGateway } from '../notification.gateway';

@Controller()
export class TransferEventsController {
  private readonly logger = new Logger(TransferEventsController.name);
  constructor(private readonly gateway: NotificationGateway) {}

  @EventPattern(TRANSFER_COMPLETED_EVENT)
  async handle(
    @Payload() event: unknown,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    try {
      if (!isTransferCompletedEvent(event))
        throw new Error('Некорректное событие перевода');
      this.gateway.sendNotification(event.fromUserId, event);
      this.gateway.sendNotification(event.toUserId, event);
      await context.getConsumer().commitOffsets([
        {
          topic: context.getTopic(),
          partition: context.getPartition(),
          offset: (BigInt(context.getMessage().offset) + 1n).toString(),
        },
      ]);
      this.logger.log(`Событие перевода ${event.eventId} обработано`);
    } catch (error: unknown) {
      this.logger.error(
        'Ошибка обработки события перевода',
        error instanceof Error ? error.stack : undefined,
      );
      throw new KafkaRetriableException('Обработка перевода не завершена');
    }
  }
}
