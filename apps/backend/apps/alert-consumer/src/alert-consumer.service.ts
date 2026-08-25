import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, type Consumer } from 'kafkajs';
import { createClient, type RedisClientType } from 'redis';
import {
  decideAlertGate,
  DEFAULT_ALERT_OPEN_DEBOUNCE_SECONDS,
  DEFAULT_ALERT_RESOLVE_HYSTERESIS_SECONDS,
  emptyAlertGatePending,
  isAlertGateIdle,
  KAFKA_TOPICS,
  parseEnvSeconds,
  REDIS_CHANNELS,
  type AlertGatePending,
  type TelemetryPoint,
} from '@it/common';
import { PrismaService } from '@it/prisma';

@Injectable()
export class AlertConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertConsumerService.name);
  private readonly kafkaConsumer: Consumer;
  private readonly redisClient: RedisClientType;
  private readonly gateByKey = new Map<string, AlertGatePending>();
  private readonly openDebounceMs: number;
  private readonly resolveHysteresisMs: number;
  private processedPoints = 0;

  constructor(private readonly prisma: PrismaService) {
    const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean);
    const kafka = new Kafka({ clientId: 'alert-consumer', brokers });

    this.kafkaConsumer = kafka.consumer({
      groupId: process.env.ALERT_CONSUMER_GROUP ?? 'alert-consumer',
    });
    this.redisClient = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
    this.openDebounceMs =
      parseEnvSeconds(
        process.env.ALERT_OPEN_DEBOUNCE_SECONDS,
        DEFAULT_ALERT_OPEN_DEBOUNCE_SECONDS,
      ) * 1000;
    this.resolveHysteresisMs =
      parseEnvSeconds(
        process.env.ALERT_RESOLVE_HYSTERESIS_SECONDS,
        DEFAULT_ALERT_RESOLVE_HYSTERESIS_SECONDS,
      ) * 1000;
  }

  async onModuleInit(): Promise<void> {
    this.redisClient.on('error', (error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Redis error: ${message}`);
    });
    await this.redisClient.connect();

    await this.kafkaConsumer.connect();
    await this.kafkaConsumer.subscribe({ topic: KAFKA_TOPICS.TELEMETRY_RAW, fromBeginning: false });
    await this.kafkaConsumer.run({
      eachMessage: async ({ message }) => {
        await this.processMessage(message.value?.toString() ?? '');
      },
    });

    this.logger.log(
      `consuming "${KAFKA_TOPICS.TELEMETRY_RAW}" → Postgres alerts/Redis ` +
        `(open debounce ${this.openDebounceMs / 1000}s, resolve hysteresis ${this.resolveHysteresisMs / 1000}s)`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.kafkaConsumer.disconnect();
    await this.redisClient.quit();
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

    const sensor = await this.prisma.sensor.findUnique({
      where: { id: point.sensorId },
      include: { thresholds: true },
    });

    if (sensor === null || !sensor.isActive) {
      return;
    }

    const nowMs = Date.parse(point.ts);
    for (const threshold of sensor.thresholds) {
      const violated =
        (threshold.minValue !== null && point.value < Number(threshold.minValue)) ||
        (threshold.maxValue !== null && point.value > Number(threshold.maxValue));
      const activeAlert = await this.prisma.alert.findFirst({
        where: {
          sensorId: point.sensorId,
          severity: threshold.severity,
          status: { in: ['open', 'acked'] },
        },
      });
      const gateKey = `${point.sensorId}:${threshold.severity}`;
      const { action, pending } = decideAlertGate({
        violated,
        hasActiveAlert: activeAlert !== null,
        nowMs,
        pending: this.gateByKey.get(gateKey) ?? emptyAlertGatePending(),
        openDebounceMs: this.openDebounceMs,
        resolveHysteresisMs: this.resolveHysteresisMs,
      });
      this.rememberGate(gateKey, pending);

      if (action === 'open') {
        await this.openAlert(point, sensor.code, threshold);
      } else if (action === 'resolve' && activeAlert !== null) {
        await this.resolveAlert(activeAlert.id, point.value, point.siteId);
      }
    }

    this.processedPoints += 1;
    if (this.processedPoints === 1 || this.processedPoints % 100 === 0) {
      this.logger.log(`проверено точек на alerts: ${this.processedPoints}`);
    }
  }

  private rememberGate(key: string, pending: AlertGatePending): void {
    if (isAlertGateIdle(pending)) {
      this.gateByKey.delete(key);
      return;
    }

    this.gateByKey.set(key, pending);
  }

  private async openAlert(
    point: TelemetryPoint,
    sensorCode: string,
    threshold: { minValue: unknown; maxValue: unknown; severity: 'warning' | 'critical' },
  ): Promise<void> {
    const isBelowMinimum = threshold.minValue !== null && point.value < Number(threshold.minValue);
    const severity = threshold.severity;
    const message = `${sensorCode} ${isBelowMinimum ? 'below minimum' : 'above maximum'}`;
    const alert = await this.prisma.alert.create({
      data: {
        sensorId: point.sensorId,
        severity,
        message,
        value: point.value,
        openedAt: new Date(point.ts),
      },
    });

    await this.publishAlert(alert, point.siteId);
    this.logger.warn(`создан ${severity} alert для ${sensorCode}: ${point.value}`);
  }

  private async resolveAlert(alertId: string, value: number, siteId: string): Promise<void> {
    const alert = await this.prisma.alert.update({
      where: { id: alertId },
      data: { status: 'resolved', resolvedAt: new Date(), value },
    });

    await this.publishAlert(alert, siteId);
  }

  private async publishAlert(alert: object, siteId: string): Promise<void> {
    await this.redisClient.publish(
      REDIS_CHANNELS.ALERTS_UPDATES,
      JSON.stringify({ ...alert, siteId }),
    );
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
