import { Module } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { ConnectionStates } from 'mongoose';
import type { DependencyChecks } from '@app/common';
import {
  HEALTH_CHECKS,
  HealthController,
  KafkaHealthService,
  LifecycleModule,
} from '@app/common';

@Module({
  imports: [LifecycleModule],
  controllers: [HealthController],
  providers: [
    KafkaHealthService,
    {
      provide: HEALTH_CHECKS,
      inject: [getConnectionToken(), KafkaHealthService],
      useFactory: (
        database: Connection,
        kafka: KafkaHealthService,
      ): DependencyChecks => ({
        mongodb: async () => {
          if (
            database.readyState !== ConnectionStates.connected ||
            !database.db
          )
            throw new Error('MongoDB disconnected');
          await database.db.admin().ping({ maxTimeMS: 1000 });
        },
        kafka: () => kafka.ping(),
      }),
    },
  ],
})
export class HealthModule {}
