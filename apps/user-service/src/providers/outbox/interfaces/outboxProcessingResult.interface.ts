export interface OutboxProcessingResult {
  eventId: string;
  published: boolean;
}
