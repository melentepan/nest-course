export const TRANSFER_COMPLETED_EVENT = 'transfer.completed';

export interface TransferCompletedEvent {
  eventId: string;
  fromUserId: number;
  toUserId: number;
  amount: string;
  occurredAt: string;
}
