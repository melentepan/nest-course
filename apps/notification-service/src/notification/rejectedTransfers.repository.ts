import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { RejectedTransferInput } from './interfaces/rejectedTransfer.interface';
import { RejectedTransfer } from './schemas/rejectedTransfer.schema';

@Injectable()
export class RejectedTransfersRepository implements OnModuleInit {
  constructor(
    @InjectModel(RejectedTransfer.name)
    private readonly model: Model<RejectedTransfer>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.model.init();
  }

  async save(input: RejectedTransferInput): Promise<void> {
    const { topic, partition, offset } = input;
    await this.model
      .updateOne(
        { topic, partition, offset },
        { $setOnInsert: input },
        { upsert: true, runValidators: true },
      )
      .exec();
  }
}
