import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { OutboxProcessingResult } from './interfaces/outboxProcessingResult.interface';
import type { OutboxRow } from './interfaces/outboxRow.interface';

@Injectable()
export class OutboxRepository {
  constructor(private readonly dataSource: DataSource) {}

  processNext(
    publish: (row: OutboxRow) => Promise<void>,
  ): Promise<OutboxProcessingResult | null> {
    return this.dataSource.transaction(async (manager) => {
      const rows: OutboxRow[] = await manager.query(`
        SELECT id, payload FROM transfer_outbox
        WHERE published_at IS NULL AND next_attempt_at <= now()
        ORDER BY next_attempt_at, created_at
        LIMIT 1 FOR UPDATE SKIP LOCKED
      `);
      const row = rows[0];
      if (!row) {
        return null;
      }

      try {
        await publish(row);
      } catch {
        await manager.query(
          `UPDATE transfer_outbox SET attempts = attempts + 1,
          next_attempt_at = now() + interval '30 seconds' WHERE id = $1`,
          [row.id],
        );
        return { eventId: row.id, published: false };
      }

      await manager.query(
        'UPDATE transfer_outbox SET published_at = now() WHERE id = $1',
        [row.id],
      );
      return { eventId: row.id, published: true };
    });
  }
}
