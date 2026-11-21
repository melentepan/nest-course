import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Interval } from '@nestjs/schedule';
import { firstValueFrom, timeout } from 'rxjs';

import { ShutdownService, TRANSFER_COMPLETED_EVENT } from '@app/common';

import type { OutboxRow } from './interfaces/outboxRow.interface';
import { OutboxRepository } from './outbox.repository';

export const OUTBOX_KAFKA = 'OUTBOX_KAFKA';

@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);
  private running?: Promise<void>;

  constructor(
    private readonly repository: OutboxRepository,
    private readonly shutdown: ShutdownService,
    @Inject(OUTBOX_KAFKA) private readonly kafka: ClientKafka,
  ) {}

  @Interval(5000)
  async publishPending(): Promise<void> {
    if (this.running) {
      return;
    }
    const release = this.shutdown.beginWork();
    if (!release) {
      return;
    }
    this.running = this.publishBatch();
    try {
      await this.running;
    } catch (error: unknown) {
      this.logger.error(
        'Ошибка обработки outbox',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.running = undefined;
      release();
    }
  }

  private async publishBatch(): Promise<void> {
    for (let i = 0; i < 100 && !this.shutdown.isDraining; i++) {
      const result = await this.repository.processNext((row) =>
        this.publish(row),
      );
      if (!result) {
        break;
      }

      if (result.published) {
        this.logger.log({
          msg: 'Событие опубликовано в Kafka',
          eventId: result.eventId,
        });
      } else {
        this.logger.warn({
          msg: 'Публикация события не удалась, повтор через 30 секунд',
          eventId: result.eventId,
        });
      }
    }
  }

  private async publish(row: OutboxRow): Promise<void> {
    try {
      await firstValueFrom(
        this.kafka
          .emit(TRANSFER_COMPLETED_EVENT, {
            key: String(row.payload.fromUserId),
            value: row.payload,
          })
          .pipe(timeout(15000)),
      );
    } catch (error: unknown) {
      await this.kafka.close();
      throw error;
    }
  }
}
