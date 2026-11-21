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
    const release = this.shutdown.beginWork();
    if (!release) {
      throw new KafkaRetriableException('Приложение останавливается');
    }
    try {
      const valid = isTransferCompletedEvent(event);
      if (valid) {
        await this.service.handleTransfer(event);
      } else {
        await this.service.quarantine({
          topic: context.getTopic(),
          partition: context.getPartition(),
          offset: context.getMessage().offset,
          payloadJson: JSON.stringify(event) ?? 'null',
          reason: 'Некорректный формат события перевода',
        });
      }
      await context.getConsumer().commitOffsets([
        {
          topic: context.getTopic(),
          partition: context.getPartition(),
          offset: (BigInt(context.getMessage().offset) + 1n).toString(),
        },
      ]);
      if (valid) {
        this.logger.log({
          msg: 'Событие перевода обработано',
          eventId: event.eventId,
        });
      } else {
        this.logger.warn({
          msg: 'Некорректное событие сохранено в карантин',
          topic: context.getTopic(),
          partition: context.getPartition(),
          offset: context.getMessage().offset,
        });
      }
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
