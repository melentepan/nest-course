import { z } from 'zod';

export const portSchema = z
  .string()
  .regex(/^\d+$/, 'должен быть целым числом от 1 до 65535')
  .refine((value) => Number(value) >= 1 && Number(value) <= 65535, {
    message: 'должен быть целым числом от 1 до 65535',
  });

export const nonEmptySchema = z
  .string()
  .refine((value) => value.trim().length > 0, {
    message: 'не должно быть пустым',
  });

export const kafkaBrokersSchema = z
  .string()
  .default('localhost:9092')
  .refine(
    (value) =>
      value.split(',').every((entry) => {
        const broker = entry.trim();
        if (!/^(?:[a-zA-Z0-9_.-]+|\[[0-9a-fA-F:]+]):\d+$/.test(broker)) {
          return false;
        }
        try {
          const url = new URL(`tcp://${broker}`);
          return portSchema.safeParse(url.port).success;
        } catch {
          return false;
        }
      }),
    { message: 'ожидается список host:port через запятую' },
  );

export function validateEnvironment(
  schema: z.ZodType<Record<string, unknown>>,
  config: Record<string, unknown>,
): Record<string, unknown> {
  const result = schema.safeParse(config);
  if (!result.success) {
    const fields = [
      ...new Set(
        result.error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`,
        ),
      ),
    ];
    throw new Error(`Некорректные переменные окружения: ${fields.join(', ')}`);
  }
  return { ...config, ...result.data };
}
