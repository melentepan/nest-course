import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { defer, finalize, Observable } from 'rxjs';

import { ShutdownService } from './shutdown.service';

@Injectable()
export class ShutdownInterceptor implements NestInterceptor {
  constructor(private readonly shutdown: ShutdownService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const request = context.switchToHttp().getRequest<Request>();
    if (request.path === '/health/live' || request.path === '/health/ready') {
      return next.handle();
    }
    const release = this.shutdown.beginWork();
    if (!release) {
      throw new ServiceUnavailableException('Приложение останавливается');
    }
    return defer(() => next.handle()).pipe(finalize(release));
  }
}
