import { Module } from '@nestjs/common';

import { AvatarCleanupModule } from './avatar-cleanup/avatarCleanup.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule, AvatarCleanupModule],
})
export class FeaturesModule {}
