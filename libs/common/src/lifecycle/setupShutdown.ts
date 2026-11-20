import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { ShutdownService } from './shutdown.service';

export function setupShutdown(app: INestApplication): void {
  const shutdown = app.get(ShutdownService);
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.path === '/health/live' || request.path === '/health/ready') {
      next();
      return;
    }
    const release = shutdown.beginWork();
    if (!release) {
      response.setHeader('Connection', 'close');
      response.status(503).json({ status: 'shutting_down' });
      return;
    }
    response.once('finish', release);
    response.once('close', release);
    next();
  });
  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);
}
