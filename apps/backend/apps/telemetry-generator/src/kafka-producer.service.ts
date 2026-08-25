import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Partitioners, type Producer } from 'kafkajs';
import { KAFKA_TOPICS, type TelemetryPoint } from '@it/common';

@Injectable()
export class KafkaProducerService implements OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly producer: Producer;
  private connected = false;

  constructor() {
    const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
      .split(',')
      .map((broker) => {
        return broker.trim();
      })
      .filter(Boolean);

    const kafka = new Kafka({
      clientId: 'telemetry-generator',
      brokers,
    });

    this.producer = kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
    });
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    this.connected = true;
    this.logger.log('Kafka producer подключён');
  }

  async sendTelemetry(points: TelemetryPoint[]): Promise<void> {
    if (!this.connected) {
      throw new Error('Kafka producer не подключён');
    }

    await this.producer.send({
      topic: KAFKA_TOPICS.TELEMETRY_RAW,
      messages: points.map((point) => {
        return {
          key: point.sensorId,
          value: JSON.stringify(point),
        };
      }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.connected) {
      return;
    }

    await this.producer.disconnect();
    this.connected = false;
    this.logger.log('Kafka producer отключён');
  }
}
