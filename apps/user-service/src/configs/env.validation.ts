import { CronTime } from 'cron';
import { z } from 'zod';

import {
  kafkaBrokersSchema,
  nonEmptySchema,
  portSchema,
  validateEnvironment,
} from '@app/common';

const hostSchema = nonEmptySchema.refine(
  (value) =>
    /^(?:[a-zA-Z0-9_.-]+|\[[0-9a-fA-F:]+]|[0-9a-fA-F]*:[0-9a-fA-F:]+)$/.test(
      value,
    ),
  { message: 'ожидается имя хоста или IP без протокола и порта' },
);
const durationSchema = z
  .string()
  .refine(
    (value) =>
      /^\d+(?:\.\d+)?\s*(?:ms|s|m|h|d|w|y)$/.test(value) &&
      parseFloat(value) > 0,
    {
      message:
        'ожидается положительный срок с единицей времени, например 15m или 7d',
    },
  );
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    USER_SERVICE_PORT: portSchema.default('3000'),
    DB_HOST: hostSchema.default('localhost'),
    DB_PORT: portSchema.default('5432'),
    DB_USERNAME: nonEmptySchema,
    DB_PASSWORD: nonEmptySchema,
    DB_NAME: nonEmptySchema,
    DB_SYNCHRONIZE: z.enum(['true', 'false']).default('false'),
    REDIS_HOST: hostSchema,
    REDIS_PORT: portSchema.default('6379'),
    REDIS_PASSWORD: nonEmptySchema,
    S3_ENDPOINT: z.string().refine(
      (value) => {
        try {
          const url = new URL(value);
          return ['http:', 'https:'].includes(url.protocol) && !!url.hostname;
        } catch {
          return false;
        }
      },
      { message: 'ожидается HTTP(S) URL хранилища' },
    ),
    S3_ACCESS_KEY_ID: nonEmptySchema,
    S3_SECRET_ACCESS_KEY: nonEmptySchema,
    JWT_ACCESS_SECRET: nonEmptySchema,
    JWT_REFRESH_SECRET: nonEmptySchema,
    JWT_ACCESS_EXPIRES_IN: durationSchema.default('15m'),
    JWT_REFRESH_EXPIRES_IN: durationSchema.default('7d'),
    KAFKA_BROKERS: kafkaBrokersSchema,
    AVATAR_CLEANUP_RETENTION_MS: z
      .string()
      .refine(
        (value) =>
          /^\d+$/.test(value) &&
          Number.isSafeInteger(Number(value)) &&
          Number(value) > 0 &&
          Number.isFinite(new Date(Date.now() - Number(value)).getTime()),
        {
          message:
            'ожидается положительное целое число миллисекунд в допустимом диапазоне даты',
        },
      )
      .default('604800000'),
    AVATAR_CLEANUP_CRON: nonEmptySchema.default('0 0 3 * * *'),
    AVATAR_CLEANUP_TIMEZONE: nonEmptySchema.default('Europe/Moscow'),
  })
  .superRefine((env, context) => {
    try {
      new CronTime(env.AVATAR_CLEANUP_CRON);
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['AVATAR_CLEANUP_CRON'],
        message: 'некорректное cron-выражение',
      });
    }
    try {
      new CronTime('0 0 3 * * *', env.AVATAR_CLEANUP_TIMEZONE);
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['AVATAR_CLEANUP_TIMEZONE'],
        message: 'некорректная временная зона',
      });
    }
  });

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  return validateEnvironment(envSchema, config);
}
