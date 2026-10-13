import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AvatarCleanupModule } from './avatar-cleanup/avatarCleanup.module';

@Module({
  imports: [UsersModule, AvatarCleanupModule],
})
export class FeaturesModule {}
