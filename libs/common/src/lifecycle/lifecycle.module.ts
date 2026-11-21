import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { ShutdownInterceptor } from './shutdown.interceptor';
import { ShutdownService } from './shutdown.service';

@Global()
@Module({
  providers: [
    ShutdownService,
    { provide: APP_INTERCEPTOR, useClass: ShutdownInterceptor },
  ],
  exports: [ShutdownService],
})
export class LifecycleModule {}
