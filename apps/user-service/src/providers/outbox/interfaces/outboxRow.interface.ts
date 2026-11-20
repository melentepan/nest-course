import type { TransferCompletedEvent } from '@app/common';

export interface OutboxRow {
  id: string;
  payload: TransferCompletedEvent;
}
