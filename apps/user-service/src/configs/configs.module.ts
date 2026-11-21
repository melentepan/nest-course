import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { accessTokenConfig, kafkaConfig } from '@app/common';

import { appConfig } from './app.config';
import { avatarCleanupConfig } from './avatarCleanup.config';
import { databaseConfig } from './database.config';
import { validateEnv } from './env.validation';
import { jwtConfig } from './jwt.config';
import { redisConfig } from './redis.config';
import { s3Config } from './s3.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
      load: [
        appConfig,
        accessTokenConfig,
        kafkaConfig,
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
