import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { AvatarCleanupService } from './avatarCleanup.service';
import { AvatarCleanupController } from './avatarCleanup.controller';
import { UsersModule } from '../users/users.module';
import { AvatarCleanupProcessor } from './avatarCleanup.processor';
import { AvatarCleanupScheduler } from './avatarCleanup.scheduler';
import { FilesModule } from '../../providers/files/files.module';

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
