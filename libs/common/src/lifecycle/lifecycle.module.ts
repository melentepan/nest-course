import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ShutdownService } from './shutdown.service';
import { ShutdownInterceptor } from './shutdown.interceptor';

@Global()
@Module({
  providers: [
    ShutdownService,
    { provide: APP_INTERCEPTOR, useClass: ShutdownInterceptor },
  ],
  exports: [ShutdownService],
})
export class LifecycleModule {}
