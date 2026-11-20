import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, mongo } from 'mongoose';
import type { TransferCompletedEvent } from '@app/common';
import { TransferNotification } from './schemas/transferNotification.schema';

@Injectable()
export class NotificationRepository implements OnModuleInit {
  constructor(
    @InjectModel(TransferNotification.name)
    private readonly model: Model<TransferNotification>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.model.init();
  }

  async saveTransfer(event: TransferCompletedEvent): Promise<void> {
    try {
      await this.model.create({
        eventId: event.eventId,
        fromUserId: event.fromUserId,
        toUserId: event.toUserId,
        amount: event.amount,
        occurredAt: event.occurredAt,
      });
    } catch (error: unknown) {
      if (!(error instanceof mongo.MongoServerError) || error.code !== 11000) {
        throw error;
      }
      const existing = await this.model
        .findOne({ eventId: event.eventId })
        .lean()
        .exec();
      if (
        !existing ||
        existing.fromUserId !== event.fromUserId ||
        existing.toUserId !== event.toUserId ||
        existing.amount !== event.amount ||
        existing.occurredAt !== event.occurredAt
      ) {
        throw new Error('Повторный eventId содержит другие данные перевода');
      }
    }
  }
}
