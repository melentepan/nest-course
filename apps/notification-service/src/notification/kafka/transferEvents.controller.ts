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
  ShutdownService,
  TRANSFER_COMPLETED_EVENT,
} from '@app/common';
import { NotificationService } from '../notification.service';

@Controller()
export class TransferEventsController {
  private readonly logger = new Logger(TransferEventsController.name);
  constructor(
    private readonly service: NotificationService,
    private readonly shutdown: ShutdownService,
  ) {}

  @EventPattern(TRANSFER_COMPLETED_EVENT)
  async handle(
    @Payload() event: unknown,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    if (!isTransferCompletedEvent(event)) {
      this.logger.error('Некорректное событие перевода');
      throw new KafkaRetriableException('Некорректное событие перевода');
    }

    const release = this.shutdown.beginWork();
    if (!release)
      throw new KafkaRetriableException('Приложение останавливается');
    try {
      await this.service.handleTransfer(event);
      await context.getConsumer().commitOffsets([
        {
          topic: context.getTopic(),
          partition: context.getPartition(),
          offset: (BigInt(context.getMessage().offset) + 1n).toString(),
        },
      ]);
      this.logger.log({
        msg: 'Событие перевода обработано',
        eventId: event.eventId,
      });
    } catch (error: unknown) {
      this.logger.error(
        'Ошибка обработки события перевода',
        error instanceof Error ? error.stack : undefined,
      );
      throw new KafkaRetriableException('Обработка перевода не завершена');
    } finally {
      release();
    }
  }
}
