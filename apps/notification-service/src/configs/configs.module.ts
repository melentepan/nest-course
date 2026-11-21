import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { accessTokenConfig, kafkaConfig } from '@app/common';

import { appConfig } from './app.config';
import { validateEnv } from './env.validation';
import { mongodbConfig } from './mongodb.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
      load: [appConfig, mongodbConfig, kafkaConfig, accessTokenConfig],
    }),
  ],
  exports: [ConfigModule],
})
export class ConfigsModule {}
