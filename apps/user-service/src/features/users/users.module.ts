import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppCacheModule } from '../../providers/cache/cache.module';
import { FilesModule } from '../../providers/files/files.module';
import { BalanceRepository } from './balance.repository';
import { BalanceService } from './balance.service';
import { User } from './entities/user.entity';
import { UserAvatar } from './entities/userAvatar.entity';
import { ProfileController } from './profile.controller';
import { UserAvatarsController } from './userAvatars.controller';
import { UserAvatarsRepository } from './userAvatars.repository';
import { UserAvatarsService } from './userAvatars.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserAvatar]),
    FilesModule,
    AppCacheModule,
  ],
  controllers: [UsersController, ProfileController, UserAvatarsController],
  providers: [
    BalanceService,
    BalanceRepository,
    UsersService,
    UsersRepository,
    UserAvatarsService,
    UserAvatarsRepository,
  ],
  exports: [UsersService, UserAvatarsRepository],
})
export class UsersModule {}
