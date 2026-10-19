import { Module } from '@nestjs/common';
import { DatabasesModule } from './databases/databases.module';
import { FilesModule } from './files/files.module';
import { AppCacheModule } from './cache/cache.module';

@Module({
  imports: [DatabasesModule, FilesModule, AppCacheModule],
  exports: [DatabasesModule, FilesModule, AppCacheModule],
})
export class ProvidersModule {}
