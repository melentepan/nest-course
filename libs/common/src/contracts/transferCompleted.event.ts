export const TRANSFER_COMPLETED_EVENT = 'transfer.completed';

export interface TransferCompletedEvent {
  eventId: string;
  fromUserId: number;
  toUserId: number;
  amount: string;
  occurredAt: string;
}

export function isTransferCompletedEvent(
  value: unknown,
): value is TransferCompletedEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.eventId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      event.eventId,
    ) &&
    typeof event.fromUserId === 'number' &&
    Number.isSafeInteger(event.fromUserId) &&
    event.fromUserId > 0 &&
    typeof event.toUserId === 'number' &&
    Number.isSafeInteger(event.toUserId) &&
    event.toUserId > 0 &&
    event.fromUserId !== event.toUserId &&
    typeof event.amount === 'string' &&
    /^(?!0+(?:\.0{1,2})?$)(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(
      event.amount,
    ) &&
    typeof event.occurredAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(event.occurredAt) &&
    Number.isFinite(Date.parse(event.occurredAt))
  );
}
