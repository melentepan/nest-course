import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ClsModule, ClsServiceManager } from 'nestjs-cls';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Request } from 'express';

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
      },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        mixin: () => ({
          requestId:
            ClsServiceManager.getClsService().getId() ?? applicationLogId,
        }),
        genReqId: (req, res) => {
          const id = getOrCreateRequestId(req);
          res.setHeader('X-Request-ID', id);
          return id;
        },
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
