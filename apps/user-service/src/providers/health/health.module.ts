import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
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
      inject: [DataSource, KafkaHealthService],
      useFactory: (
        database: DataSource,
        kafka: KafkaHealthService,
      ): DependencyChecks => ({
        postgres: () => database.query('SELECT 1'),
        kafka: () => kafka.ping(),
      }),
    },
  ],
})
export class HealthModule {}
