import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: Number(process.env.NOTIFICATION_SERVICE_PORT ?? 3001),
}));
