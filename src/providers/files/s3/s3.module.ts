import * as AWS from '@aws-sdk/client-s3';
import { Module } from '@nestjs/common';

import { S3Lib } from './constants/doSpacesServiceLib.constant';
import { S3Service } from './s3.service';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    S3Service,
    {
      provide: S3Lib,
      useFactory: (configService: ConfigService) => {
        return new AWS.S3({
          endpoint: configService.getOrThrow<string>('s3.endpoint'),
          region: 'ru-central1',
          credentials: {
            accessKeyId: configService.getOrThrow<string>('s3.accessKeyId'),
            secretAccessKey:
              configService.getOrThrow<string>('s3.secretAccessKey'),
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [S3Service, S3Lib],
})
export class S3Module {}
