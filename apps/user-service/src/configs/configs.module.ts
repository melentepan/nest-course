import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { jwtConfig } from './jwt.config';
import { s3Config } from './s3.config';
import { redisConfig } from './redis.config';
import { avatarCleanupConfig } from './avatarCleanup.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        s3Config,
        redisConfig,
        avatarCleanupConfig,
      ],
    }),
  ],
  exports: [ConfigModule],
})
export class ConfigsModule {}
