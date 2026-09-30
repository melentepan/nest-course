import { Module } from '@nestjs/common';
import { ProvidersModule } from './providers/providers.module';
import { ConfigsModule } from './configs/configs.module';
import { FeaturesModule } from './features/features.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [ConfigsModule, ProvidersModule, FeaturesModule, AuthModule],
})
export class AppModule {}
