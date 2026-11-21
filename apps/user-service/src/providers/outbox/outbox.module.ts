import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { OUTBOX_KAFKA, OutboxPublisher } from './outbox.publisher';
import { OutboxRepository } from './outbox.repository';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: OUTBOX_KAFKA,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'user-service',
              brokers: config.getOrThrow<string[]>('kafka.brokers'),
              connectionTimeout: 3000,
              requestTimeout: 5000,
              retry: { retries: 2 },
            },
            producerOnlyMode: true,
            producer: { allowAutoTopicCreation: false },
            send: { acks: -1, timeout: 5000 },
          },
        }),
      },
    ]),
  ],
  providers: [OutboxPublisher, OutboxRepository],
})
export class OutboxModule {}
