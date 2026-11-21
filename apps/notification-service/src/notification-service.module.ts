import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import {
  AccessTokenModule,
  HttpErrorsModule,
  LoggingModule,
} from '@app/common';

import { ConfigsModule } from './configs/configs.module';
import { NotificationModule } from './notification/notification.module';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { MongoDbModule } from './providers/databases/mongodb/mongodb.module';
import { HealthModule } from './providers/health/health.module';

@Module({
  imports: [
    HealthModule,
    ConfigsModule,
    LoggingModule,
    HttpErrorsModule,
    MongoDbModule,
    NotificationModule,
    AccessTokenModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwtAccess.secret'),
      }),
    }),
  ],
  controllers: [NotificationServiceController],
  providers: [NotificationServiceService],
})
export class NotificationServiceModule {}
