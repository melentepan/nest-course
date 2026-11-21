export interface RejectedTransferInput {
  topic: string;
  partition: number;
  offset: string;
  payloadJson: string;
  reason: string;
}
