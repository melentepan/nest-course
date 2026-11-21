import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import { Module } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ClsModule, ClsServiceManager } from 'nestjs-cls';
import { LoggerModule } from 'nestjs-pino';

function getOrCreateRequestId(req: IncomingMessage): string {
  if (typeof req.id === 'string' && req.id.length > 0) {
    return req.id;
  }

  const header = req.headers['x-request-id'];
  const id =
    typeof header === 'string' && header.trim().length > 0
      ? header.trim()
      : randomUUID();
  req.id = id;
  return id;
}

const applicationLogId = randomUUID();

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: Request) => getOrCreateRequestId(req),
        setup: (cls, _req: Request, res: Response) => {
          res.setHeader('X-Request-ID', cls.getId());
        },
      },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        mixin: () => ({
          requestId:
            ClsServiceManager.getClsService().getId() ?? applicationLogId,
        }),
        genReqId: (req) => getOrCreateRequestId(req),
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        redact: {
          paths: [
            'req.headers.authorization',
            'password',
            'refreshToken',
            'accessToken',
            'secretAccessKey',
            'accessKeyId',
            'req.body.password',
            'req.body.refreshToken',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
          ],
          remove: true,
        },
      },
    }),
  ],
})
export class LoggingModule {}
