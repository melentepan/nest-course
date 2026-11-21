import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ACCESS_TOKEN_OPTIONS } from './accessToken.constants';
import { AccessTokenService } from './accessToken.service';
import type { AccessTokenAsyncOptions } from './interfaces/accessTokenOptions.interface';

@Module({})
export class AccessTokenModule {
  static registerAsync(options: AccessTokenAsyncOptions): DynamicModule {
    return {
      module: AccessTokenModule,
      global: true,
      imports: [...(options.imports ?? []), JwtModule.register({})],
      providers: [
        {
          provide: ACCESS_TOKEN_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        AccessTokenService,
      ],
      exports: [AccessTokenService],
    };
  }
}
