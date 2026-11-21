import { mongo } from 'mongoose';
import { z } from 'zod';

import {
  kafkaBrokersSchema,
  nonEmptySchema,
  portSchema,
  validateEnvironment,
} from '@app/common';

const envSchema = z.object({
  NOTIFICATION_SERVICE_PORT: portSchema.default('3001'),
  JWT_ACCESS_SECRET: nonEmptySchema,
  KAFKA_BROKERS: kafkaBrokersSchema,
  MONGODB_URI: z.string().refine(
    (value) => {
      try {
        // Конструктор проверяет URI без подключения к серверу.
        new mongo.MongoClient(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'ожидается корректный URI mongodb:// или mongodb+srv://' },
  ),
});

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  return validateEnvironment(envSchema, config);
}
