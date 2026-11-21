import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'rejected_transfers', versionKey: false })
export class RejectedTransfer {
  @Prop({ type: String, required: true })
  topic: string;

  @Prop({ type: Number, required: true })
  partition: number;

  @Prop({ type: String, required: true })
  offset: string;

  @Prop({ type: String, required: true })
  payloadJson: string;

  @Prop({ type: String, required: true })
  reason: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const RejectedTransferSchema =
  SchemaFactory.createForClass(RejectedTransfer);
RejectedTransferSchema.index(
  { topic: 1, partition: 1, offset: 1 },
  { unique: true },
);
