import { HealthModule } from './providers/health/health.module';
import { OutboxModule } from './providers/outbox/outbox.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { ProvidersModule } from './providers/providers.module';
import { ConfigsModule } from './configs/configs.module';
import { FeaturesModule } from './features/features.module';
import { AuthModule } from './auth/auth.module';
import {
  AccessTokenModule,
  HttpErrorsModule,
  LoggingModule,
} from '@app/common';
import { SchedulingModule } from './providers/scheduling/scheduling.module';

@Module({
  imports: [
    HealthModule,
    LoggingModule,
    HttpErrorsModule,
    AccessTokenModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    ConfigsModule,
    ProvidersModule,
    FeaturesModule,
    AuthModule,
    SchedulingModule,
    OutboxModule,
  ],
})
export class AppModule {}
