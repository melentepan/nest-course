import { ConfigService } from '@nestjs/config';

export function getKafkaBrokers(config: ConfigService): string[] {
  const brokers = config
    .get<string>('KAFKA_BROKERS', 'localhost:9092')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);
  if (!brokers.length) throw new Error('KAFKA_BROKERS не должен быть пустым');
  return brokers;
}
