import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CreateTransferOutbox1795176000000 } from '../../outbox/migrations/1795176000000-createTransferOutbox';
import { CreateUsersAndAvatars1795175000000 } from './migrations/1795175000000-createUsersAndAvatars';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('database.host'),
        port: configService.getOrThrow<number>('database.port'),
        username: configService.getOrThrow<string>('database.username'),
        password: configService.getOrThrow<string>('database.password'),
        database: configService.getOrThrow<string>('database.name'),
        synchronize: configService.get('database.synchronize'),
        autoLoadEntities: true,
        migrations: [
          CreateUsersAndAvatars1795175000000,
          CreateTransferOutbox1795176000000,
        ],
        migrationsRun: true,
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule],
})
export class PostgresqlModule {}
