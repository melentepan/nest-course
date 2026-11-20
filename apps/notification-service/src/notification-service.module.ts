import { HealthModule } from './providers/health/health.module';
import { MongoDbModule } from './providers/databases/mongodb/mongodb.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  AccessTokenModule,
  HttpErrorsModule,
  LoggingModule,
} from '@app/common';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    HealthModule,
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    LoggingModule,
    HttpErrorsModule,
    MongoDbModule,
    NotificationModule,
    AccessTokenModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [NotificationServiceController],
  providers: [NotificationServiceService],
})
export class NotificationServiceModule {}
