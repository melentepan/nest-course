export interface TransferResult {
  recipientId: number;
  amount: string;
  balance: string;
}

export interface TransferCommitResult extends TransferResult {
  eventId: string;
}
