import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('mongodb.uri'),
        serverSelectionTimeoutMS: 5000,
        bufferCommands: false,
        autoIndex: true,
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class MongoDbModule {}
