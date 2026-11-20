import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ClientKafka } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { firstValueFrom, timeout } from 'rxjs';
import { ShutdownService, TRANSFER_COMPLETED_EVENT } from '@app/common';
import type { OutboxRow } from './interfaces/outboxRow.interface';

export const OUTBOX_KAFKA = 'OUTBOX_KAFKA';

@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);
  private running?: Promise<void>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly shutdown: ShutdownService,
    @Inject(OUTBOX_KAFKA) private readonly kafka: ClientKafka,
  ) {}

  @Interval(5000)
  async publishPending(): Promise<void> {
    if (this.running) return;
    const release = this.shutdown.beginWork();
    if (!release) return;
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
      const found = await this.dataSource.transaction(async (manager) => {
        const rows: OutboxRow[] =
          await manager.query(`SELECT id, payload FROM transfer_outbox
          WHERE published_at IS NULL AND next_attempt_at <= now()
          ORDER BY next_attempt_at, created_at LIMIT 1 FOR UPDATE SKIP LOCKED`);
        const row = rows[0];
        if (!row) return false;
        try {
          await firstValueFrom(
            this.kafka
              .emit(TRANSFER_COMPLETED_EVENT, {
                key: String(row.payload.fromUserId),
                value: row.payload,
              })
              .pipe(timeout(15000)),
          );
        } catch {
          await this.kafka.close();
          await manager.query(
            `UPDATE transfer_outbox SET attempts = attempts + 1,
            next_attempt_at = now() + interval '30 seconds' WHERE id = $1`,
            [row.id],
          );
          this.logger.warn({
            msg: 'Публикация события не удалась, повтор через 30 секунд',
            eventId: row.id,
          });
          return true;
        }
        await manager.query(
          'UPDATE transfer_outbox SET published_at = now() WHERE id = $1',
          [row.id],
        );
        this.logger.log({
          msg: 'Событие опубликовано в Kafka',
          eventId: row.id,
        });
        return true;
      });
      if (!found) break;
    }
  }
}
