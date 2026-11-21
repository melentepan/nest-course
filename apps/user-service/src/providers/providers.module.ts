import { Module } from '@nestjs/common';

import { AppCacheModule } from './cache/cache.module';
import { DatabasesModule } from './databases/databases.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [DatabasesModule, FilesModule, AppCacheModule],
  exports: [DatabasesModule, FilesModule, AppCacheModule],
})
export class ProvidersModule {}
