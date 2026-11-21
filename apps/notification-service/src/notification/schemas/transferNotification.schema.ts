import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import type { TransferCompletedEvent } from '@app/common';

@Schema({ collection: 'transfer_notifications', versionKey: false })
export class TransferNotification implements TransferCompletedEvent {
  @Prop({ type: String, required: true, unique: true })
  eventId: string;

  @Prop({ type: Number, required: true })
  fromUserId: number;

  @Prop({ type: Number, required: true })
  toUserId: number;

  @Prop({ type: String, required: true })
  amount: string;

  @Prop({ type: String, required: true })
  occurredAt: string;
}

export const TransferNotificationSchema =
  SchemaFactory.createForClass(TransferNotification);
