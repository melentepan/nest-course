import { Module } from '@nestjs/common';
import { ProvidersModule } from './providers/providers.module';
import { ConfigsModule } from './configs/configs.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [ConfigsModule, ProvidersModule, UsersModule, AuthModule],
})
export class AppModule {}
