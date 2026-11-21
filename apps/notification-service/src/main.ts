import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { KafkaOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';

import { setupShutdown, ShutdownService } from '@app/common';

import { NotificationServiceModule } from './notification-service.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationServiceModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  setupShutdown(app);
  const config = app.get(ConfigService);
  app.connectMicroservice<KafkaOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'notification-service',
        brokers: config.getOrThrow<string[]>('kafka.brokers'),
      },
      consumer: {
        groupId: 'transfer-notifications-v1',
        allowAutoTopicCreation: false,
      },
      subscribe: { fromBeginning: true },
      run: { autoCommit: false },
    },
  });
  await app.init();
  await app.startAllMicroservices();
  await app.listen(config.getOrThrow<number>('app.port'));
  app.get(ShutdownService).markStarted();
}
void bootstrap();
