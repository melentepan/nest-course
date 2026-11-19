import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import type { HttpErrorResponse } from './httpErrorResponse.interface';

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly cls: ClsService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId =
      this.cls.getId() ||
      (typeof request.id === 'string' && request.id) ||
      randomUUID();
    const path = (request.originalUrl || request.url).split('?')[0];
    let message: string | string[] = 'Внутренняя ошибка сервера';

    if (exception instanceof HttpException && statusCode < 500) {
      const body = exception.getResponse();
      message = exception.message;
      if (typeof body === 'string') {
        message = body;
      } else if ('message' in body) {
        const value: unknown = body.message;
        if (typeof value === 'string') {
          message = value;
        } else if (
          Array.isArray(value) &&
          value.every(
            (item: unknown): item is string => typeof item === 'string',
          )
        ) {
          message = value;
        }
      }
    }

    if (statusCode >= 500) {
      this.logger.error(
        `Ошибка HTTP ${statusCode}: ${request.method} ${path}, requestId=${requestId}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    if (response.headersSent) {
      return;
    }

    const body: HttpErrorResponse = {
      statusCode,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      path,
    };
    response.setHeader('X-Request-ID', requestId);
    response.status(statusCode).json(body);
  }
}
