import { registerAs } from '@nestjs/config';

export const kafkaConfig = registerAs('kafka', () => {
  const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);
  if (!brokers.length) {
    throw new Error('KAFKA_BROKERS не должен быть пустым');
  }
  return { brokers };
});
