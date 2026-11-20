import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, logLevel } from 'kafkajs';
import { getKafkaBrokers } from '../kafka/kafka.config';
import { TRANSFER_COMPLETED_EVENT } from '../contracts/transferCompleted.event';

@Injectable()
export class KafkaHealthService {
  constructor(private readonly config: ConfigService) {}

  async ping(): Promise<void> {
    const admin = new Kafka({
      clientId: 'readiness',
      brokers: getKafkaBrokers(this.config),
      connectionTimeout: 1000,
      requestTimeout: 1000,
      retry: { retries: 0 },
      logLevel: logLevel.NOTHING,
    }).admin();
    try {
      await admin.connect();
      await admin.fetchTopicMetadata({ topics: [TRANSFER_COMPLETED_EVENT] });
    } finally {
      await admin.disconnect();
    }
  }
}
