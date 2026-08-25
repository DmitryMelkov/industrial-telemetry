import { Injectable, Logger } from '@nestjs/common';
import {
  METRIC_SIGNAL_DEFAULTS,
  SEED_SENSORS,
  type MetricType,
  type SeedSensorSpec,
} from '@it/common';
import { PrismaService } from '@it/prisma';

const SEED_BY_ID: ReadonlyMap<string, SeedSensorSpec> = new Map(
  SEED_SENSORS.map((sensor) => [sensor.sensorId, sensor]),
);

@Injectable()
export class SensorCatalogService {
  private readonly logger = new Logger(SensorCatalogService.name);
  private sensors: SeedSensorSpec[] = [];
  private fingerprint = '';
  private lastRefreshAt = 0;
  readonly refreshMs: number;

  constructor(private readonly prisma: PrismaService) {
    const parsed = Number(process.env.GENERATOR_SENSOR_REFRESH_MS ?? 10_000);
    this.refreshMs = Number.isFinite(parsed) && parsed > 0 ? parsed : 10_000;
  }

  getSensors(): readonly SeedSensorSpec[] {
    return this.sensors;
  }

  async refreshIfStale(force = false): Promise<void> {
    if (!force && this.lastRefreshAt !== 0 && Date.now() - this.lastRefreshAt < this.refreshMs) {
      return;
    }

    await this.refresh();
  }

  private async refresh(): Promise<void> {
    try {
      const rows = await this.prisma.sensor.findMany({
        where: { isActive: true },
        select: {
          id: true,
          metric: true,
          unit: true,
          lineId: true,
          line: {
            select: {
              siteId: true,
            },
          },
        },
      });

      const next = rows.map((row) => {
        return this.toSpec(row);
      });
      const fingerprint = next
        .map((sensor) => {
          return sensor.sensorId;
        })
        .sort()
        .join(',');

      this.sensors = next;
      this.lastRefreshAt = Date.now();

      if (fingerprint !== this.fingerprint) {
        this.fingerprint = fingerprint;
        this.logger.log(`каталог датчиков обновлён: ${next.length} активных`);
      }
    } catch (error) {
      this.lastRefreshAt = Date.now();
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`не удалось обновить каталог датчиков: ${message}`);
    }
  }

  private toSpec(row: {
    id: string;
    metric: MetricType;
    unit: string;
    lineId: string;
    line: { siteId: string };
  }): SeedSensorSpec {
    const seed = SEED_BY_ID.get(row.id);

    if (seed) {
      return {
        ...seed,
        siteId: row.line.siteId,
        lineId: row.lineId,
        metric: row.metric,
        unit: row.unit,
      };
    }

    const signal = METRIC_SIGNAL_DEFAULTS[row.metric];

    return {
      sensorId: row.id,
      siteId: row.line.siteId,
      lineId: row.lineId,
      metric: row.metric,
      unit: row.unit,
      baseValue: signal.baseValue,
      noise: signal.noise,
    };
  }
}
