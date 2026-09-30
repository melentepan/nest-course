import { Module } from '@nestjs/common';
import { DatabasesModule } from './databases/databases.module';

@Module({
  imports: [DatabasesModule],
  exports: [DatabasesModule],
})
export class ProvidersModule {}
