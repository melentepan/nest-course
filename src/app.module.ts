import { Module } from '@nestjs/common';
import { ProvidersModule } from './providers/providers.module';
import { ConfigsModule } from './configs/configs.module';
import { FeaturesModule } from './features/features.module';
import { AuthModule } from './auth/auth.module';
import { LoggingModule } from './logging/logging.module';
import { SchedulingModule } from './providers/scheduling/scheduling.module';

@Module({
  imports: [
    LoggingModule,
    ConfigsModule,
    ProvidersModule,
    FeaturesModule,
    AuthModule,
    SchedulingModule,
  ],
})
export class AppModule {}
