import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { KAFKA_TOPICS, type SeedSensorSpec, type TelemetryPoint } from '@it/common';
import { KafkaProducerService } from './kafka-producer.service';
import { SensorCatalogService } from './sensor-catalog.service';

@Injectable()
export class TelemetryGeneratorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelemetryGeneratorService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickInFlight = false;
  private publishedBatches = 0;

  constructor(
    private readonly kafkaProducer: KafkaProducerService,
    private readonly sensorCatalog: SensorCatalogService,
  ) {}

  async onModuleInit(): Promise<void> {
    const parsed = Number(process.env.GENERATOR_INTERVAL_MS ?? 1000);
    const intervalMs = Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;

    await this.kafkaProducer.connect();
    await this.sensorCatalog.refreshIfStale(true);

    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);

    this.logger.log(
      `публикация активных датчиков из Postgres → "${KAFKA_TOPICS.TELEMETRY_RAW}" каждые ${intervalMs}ms (refresh каталога ${this.sensorCatalog.refreshMs}ms)`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.tickInFlight) {
      return;
    }

    this.tickInFlight = true;

    try {
      await this.sensorCatalog.refreshIfStale();
      const sensors = this.sensorCatalog.getSensors();

      if (sensors.length === 0) {
        return;
      }

      const points = sensors.map((sensor) => {
        return this.buildPoint(sensor);
      });

      await this.kafkaProducer.sendTelemetry(points);
      this.publishedBatches += 1;

      if (this.publishedBatches === 1 || this.publishedBatches % 10 === 0) {
        this.logger.log(`опубликован батч #${this.publishedBatches} (${points.length} точек)`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`не удалось опубликовать телеметрию: ${message}`);
    } finally {
      this.tickInFlight = false;
    }
  }

  private buildPoint(sensor: SeedSensorSpec): TelemetryPoint {
    const raw = sensor.baseValue + (Math.random() * 2 - 1) * sensor.noise;
    const value = Math.round(raw * 100) / 100;

    return {
      sensorId: sensor.sensorId,
      siteId: sensor.siteId,
      lineId: sensor.lineId,
      metric: sensor.metric,
      value,
      unit: sensor.unit,
      ts: new Date().toISOString(),
    };
  }
}
