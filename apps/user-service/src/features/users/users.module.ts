import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ProfileController } from './profile.controller';
import { UsersRepository } from './users.repository';
import { UserAvatar } from './entities/userAvatar.entity';
import { UserAvatarsController } from './userAvatars.controller';
import { UserAvatarsService } from './userAvatars.service';
import { UserAvatarsRepository } from './userAvatars.repository';
import { FilesModule } from '../../providers/files/files.module';
import { AppCacheModule } from '../../providers/cache/cache.module';
import { BalanceRepository } from './balance.repository';
import { BalanceService } from './balance.service';

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
