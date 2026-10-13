import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const host = configService.getOrThrow<string>('redis.host');
        const port = configService.getOrThrow<number>('redis.port');
        const password = configService.getOrThrow<string>('redis.password');

        return {
          ttl: 30000,
          stores: [
            createKeyv(
              `redis://:${encodeURIComponent(password)}@${host}:${port}`,
            ),
          ],
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [CacheModule],
})
export class RedisModule {}
