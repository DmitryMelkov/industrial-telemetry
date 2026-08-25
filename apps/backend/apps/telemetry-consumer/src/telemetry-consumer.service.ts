import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, type Consumer } from 'kafkajs';
import { MongoClient, type Collection } from 'mongodb';
import { createClient, type RedisClientType } from 'redis';
import TarantoolConnection from 'tarantool-driver';
import { KAFKA_TOPICS, REDIS_CHANNELS, type TelemetryPoint } from '@it/common';

@Injectable()
export class TelemetryConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelemetryConsumerService.name);
  private readonly kafkaConsumer: Consumer;
  private readonly mongoClient: MongoClient;
  private readonly redisClient: RedisClientType;
  private readonly tarantoolClient: TarantoolConnection;
  private telemetryPoints: Collection<TelemetryPoint> | null = null;
  private processedPoints = 0;

  constructor() {
    const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean);
    const kafka = new Kafka({ clientId: 'telemetry-consumer', brokers });

    this.kafkaConsumer = kafka.consumer({
      groupId: process.env.KAFKA_CONSUMER_GROUP ?? 'telemetry-consumer',
    });
    this.mongoClient = new MongoClient(
      process.env.MONGO_URL ?? 'mongodb://localhost:27017/telemetry',
    );
    this.redisClient = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
    this.tarantoolClient = new TarantoolConnection({
      host: process.env.TARANTOOL_HOST ?? 'localhost',
      port: Number(process.env.TARANTOOL_PORT_CLIENT ?? process.env.TARANTOOL_PORT ?? 3301),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.mongoClient.connect();
    this.telemetryPoints = this.mongoClient.db().collection<TelemetryPoint>('telemetry_points');
    await this.telemetryPoints.createIndex({ sensorId: 1, ts: -1 });
    await this.telemetryPoints.createIndex({ siteId: 1, ts: -1 });

    this.redisClient.on('error', (error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Redis error: ${message}`);
    });
    await this.redisClient.connect();
    await this.tarantoolClient.ping();

    await this.kafkaConsumer.connect();
    await this.kafkaConsumer.subscribe({ topic: KAFKA_TOPICS.TELEMETRY_RAW, fromBeginning: false });
    await this.kafkaConsumer.run({
      eachMessage: async ({ message }) => {
        await this.processMessage(message.value?.toString() ?? '');
      },
    });

    this.logger.log(`consuming "${KAFKA_TOPICS.TELEMETRY_RAW}" → MongoDB/Redis`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.kafkaConsumer.disconnect();
    await this.redisClient.quit();
    await this.mongoClient.close();
    this.tarantoolClient.destroy();
  }

  private async processMessage(rawMessage: string): Promise<void> {
    let point: TelemetryPoint;

    try {
      point = JSON.parse(rawMessage) as TelemetryPoint;
    } catch {
      this.logger.warn('пропущено некорректное JSON-сообщение Kafka');
      return;
    }

    if (!this.isTelemetryPoint(point)) {
      this.logger.warn('пропущено сообщение Kafka с неверной схемой');
      return;
    }

    if (this.telemetryPoints === null) {
      this.logger.error('MongoDB collection не инициализирована');
      return;
    }

    await this.telemetryPoints.insertOne(point);
    await this.tarantoolClient.replace('sensor_latest', [
      point.sensorId,
      point.value,
      point.unit,
      point.metric,
      Date.parse(point.ts),
      point.siteId,
      point.lineId,
    ]);
    await this.redisClient.publish(REDIS_CHANNELS.TELEMETRY_UPDATES, JSON.stringify(point));
    this.processedPoints += 1;

    if (this.processedPoints === 1 || this.processedPoints % 100 === 0) {
      this.logger.log(`обработано точек: ${this.processedPoints}`);
    }
  }

  private isTelemetryPoint(value: TelemetryPoint): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof value.sensorId === 'string' &&
      typeof value.siteId === 'string' &&
      typeof value.lineId === 'string' &&
      typeof value.metric === 'string' &&
      typeof value.value === 'number' &&
      Number.isFinite(value.value) &&
      typeof value.unit === 'string' &&
      typeof value.ts === 'string' &&
      !Number.isNaN(Date.parse(value.ts))
    );
  }
}
