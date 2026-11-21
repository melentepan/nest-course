import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FilesModule } from '../../providers/files/files.module';
import { UsersModule } from '../users/users.module';
import { AvatarCleanupController } from './avatarCleanup.controller';
import { AvatarCleanupProcessor } from './avatarCleanup.processor';
import { AvatarCleanupScheduler } from './avatarCleanup.scheduler';
import { AvatarCleanupService } from './avatarCleanup.service';

@Module({
  imports: [
    UsersModule,
    FilesModule,
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.getOrThrow<string>('redis.host'),
          port: configService.getOrThrow<number>('redis.port'),
          password: configService.getOrThrow<string>('redis.password'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'avatar-cleanup',
    }),
  ],
  providers: [
    AvatarCleanupService,
    AvatarCleanupProcessor,
    AvatarCleanupScheduler,
  ],
  controllers: [AvatarCleanupController],
})
export class AvatarCleanupModule {}
