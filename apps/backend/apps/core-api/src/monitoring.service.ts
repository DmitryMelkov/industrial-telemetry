import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MongoClient, type Collection } from 'mongodb';
import TarantoolConnection from 'tarantool-driver';
import {
  clampAlertListLimit,
  clampAlertListOffset,
  mapHistoryBucket,
  parseAlertSeverity,
  parseAlertStatus,
  parseCreateCodeName,
  parseHistoryInterval,
  parseIsoDate,
  parsePatchCodeName,
  resolveHistoryBucketMs,
  type HistoryBucketRow,
} from '@it/common';
import { PrismaService } from '@it/prisma';

interface LatestSensorRow {
  sensorId: string;
  value: number;
  unit: string;
  metric: string;
  ts: number;
  siteId: string;
  lineId: string;
}

export interface TelemetryHistoryPoint {
  sensorId: string;
  siteId?: string;
  value: number;
  unit: string;
  metric: string;
  ts: string;
}

interface CreateSensorData {
  lineId: string;
  code: string;
  name: string;
  metric: 'temperature' | 'pressure' | 'vibration' | 'flow';
  unit: string;
  isActive?: boolean;
}

interface UpdateSensorData {
  code?: string;
  name?: string;
  unit?: string;
  isActive?: boolean;
}

interface ReplaceThresholdsData {
  thresholds: Array<{
    minValue?: number | null;
    maxValue?: number | null;
    severity: 'warning' | 'critical';
  }>;
}

@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly mongoClient: MongoClient;
  private readonly tarantoolClient: TarantoolConnection;
  private telemetryPoints: Collection<TelemetryHistoryPoint> | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.mongoClient = new MongoClient(
      process.env.MONGO_URL ?? 'mongodb://localhost:27017/telemetry',
    );
    this.tarantoolClient = new TarantoolConnection({
      host: process.env.TARANTOOL_HOST ?? 'localhost',
      port: Number(process.env.TARANTOOL_PORT_CLIENT ?? process.env.TARANTOOL_PORT ?? 3301),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.mongoClient.connect();
    this.telemetryPoints = this.mongoClient
      .db()
      .collection<TelemetryHistoryPoint>('telemetry_points');
    await this.telemetryPoints.createIndex({ sensorId: 1, ts: -1 });
  }

  async onModuleDestroy(): Promise<void> {
    await this.mongoClient.close();
    this.tarantoolClient.destroy();
  }

  listSites() {
    return this.prisma.site.findMany({
      orderBy: { code: 'asc' },
      include: { lines: { orderBy: { code: 'asc' } } },
    });
  }

  getSite(id: string) {
    return this.prisma.site.findUniqueOrThrow({
      where: { id },
      include: { lines: { orderBy: { code: 'asc' } } },
    });
  }

  async createSite(input: { code?: string; name?: string }) {
    const parsed = parseCreateCodeName(input);
    if (!parsed) {
      throw new BadRequestException('code and name are required');
    }

    try {
      return await this.prisma.site.create({
        data: parsed,
        include: { lines: { orderBy: { code: 'asc' } } },
      });
    } catch (error) {
      this.rethrowPrisma(error, 'Site code already exists');
    }
  }

  async updateSite(id: string, input: { code?: string; name?: string }) {
    const parsed = parsePatchCodeName(input);
    if (!parsed) {
      throw new BadRequestException('code and name must be non-empty when provided');
    }
    if (Object.keys(parsed).length === 0) {
      return this.getSite(id);
    }

    try {
      return await this.prisma.site.update({
        where: { id },
        data: parsed,
        include: { lines: { orderBy: { code: 'asc' } } },
      });
    } catch (error) {
      this.rethrowPrisma(error, 'Site code already exists');
    }
  }

  async createLine(siteId: string, input: { code?: string; name?: string }) {
    const parsed = parseCreateCodeName(input);
    if (!parsed) {
      throw new BadRequestException('code and name are required');
    }

    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    try {
      return await this.prisma.line.create({
        data: { siteId, code: parsed.code, name: parsed.name },
      });
    } catch (error) {
      this.rethrowPrisma(error, 'Line code already exists on this site');
    }
  }

  async updateLine(id: string, input: { code?: string; name?: string }) {
    const parsed = parsePatchCodeName(input);
    if (!parsed) {
      throw new BadRequestException('code and name must be non-empty when provided');
    }

    if (Object.keys(parsed).length === 0) {
      try {
        return await this.prisma.line.findUniqueOrThrow({ where: { id } });
      } catch (error) {
        this.rethrowPrisma(error, 'Line not found');
      }
    }

    try {
      return await this.prisma.line.update({
        where: { id },
        data: parsed,
      });
    } catch (error) {
      this.rethrowPrisma(error, 'Line code already exists on this site');
    }
  }

  private rethrowPrisma(error: unknown, conflictMessage: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(conflictMessage);
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Resource not found');
      }
    }
    throw error;
  }

  listSensors(filters: { siteId?: string; lineId?: string; metric?: string }) {
    return this.prisma.sensor.findMany({
      where: {
        lineId: filters.lineId,
        metric: filters.metric as never,
        line: filters.siteId ? { siteId: filters.siteId } : undefined,
      },
      orderBy: { code: 'asc' },
      include: { thresholds: true, line: true },
    });
  }

  getSensor(id: string) {
    return this.prisma.sensor.findUniqueOrThrow({
      where: { id },
      include: { thresholds: true, line: true },
    });
  }

  createSensor(data: CreateSensorData) {
    return this.prisma.sensor.create({
      data: {
        lineId: data.lineId,
        code: data.code,
        name: data.name,
        metric: data.metric,
        unit: data.unit,
        isActive: data.isActive ?? true,
      },
      include: { thresholds: true, line: true },
    });
  }

  updateSensor(id: string, data: UpdateSensorData) {
    return this.prisma.sensor.update({
      where: { id },
      data,
      include: { thresholds: true, line: true },
    });
  }

  async replaceThresholds(sensorId: string, data: ReplaceThresholdsData) {
    const sensor = await this.prisma.sensor.findUniqueOrThrow({ where: { id: sensorId } });
    await this.prisma.$transaction([
      this.prisma.sensorThreshold.deleteMany({ where: { sensorId } }),
      ...data.thresholds.map((threshold) =>
        this.prisma.sensorThreshold.create({
          data: {
            sensorId,
            minValue: threshold.minValue ?? null,
            maxValue: threshold.maxValue ?? null,
            severity: threshold.severity,
          },
        }),
      ),
    ]);

    return this.getSensor(sensor.id);
  }

  async getOverview(siteId: string) {
    const site = await this.prisma.site.findUniqueOrThrow({
      where: { id: siteId },
      include: { lines: { include: { sensors: true } } },
    });
    const latestRows = await this.tarantoolClient.select(
      'sensor_latest',
      'primary',
      1000,
      0,
      'all',
    );
    const latestBySensor = new Map(
      latestRows.map((row) => {
        const latest = this.toLatestSensor(row);
        return [latest.sensorId, latest];
      }),
    );
    const sensorIds = site.lines.flatMap((line) => line.sensors.map((sensor) => sensor.id));
    const activeAlerts = await this.prisma.alert.findMany({
      where: { status: { in: ['open', 'acked'] }, sensorId: { in: sensorIds } },
      select: { sensorId: true, severity: true },
    });
    const alertSeverityBySensor = new Map<string, 'warning' | 'critical'>();
    for (const alert of activeAlerts) {
      const currentSeverity = alertSeverityBySensor.get(alert.sensorId);
      if (currentSeverity !== 'critical' || alert.severity === 'critical') {
        alertSeverityBySensor.set(alert.sensorId, alert.severity);
      }
    }

    return {
      siteId,
      sensors: site.lines.flatMap((line) =>
        line.sensors.map((sensor) => {
          const latest = latestBySensor.get(sensor.id);
          return {
            id: sensor.id,
            code: sensor.code,
            metric: sensor.metric,
            unit: sensor.unit,
            value: latest?.value ?? null,
            ts: latest ? new Date(latest.ts).toISOString() : null,
            status: latest ? (alertSeverityBySensor.get(sensor.id) ?? 'ok') : 'unknown',
          };
        }),
      ),
      openAlerts: activeAlerts.length,
    };
  }

  async getHistory(sensorId: string, from?: string, to?: string, limit = 500, interval?: string) {
    const sensor = await this.prisma.sensor.findUniqueOrThrow({ where: { id: sensorId } });
    if (this.telemetryPoints === null) {
      return { sensor, points: [] };
    }

    const cappedLimit = Math.min(Math.max(limit, 1), 5000);
    const bucketMs = resolveHistoryBucketMs(from, to, parseHistoryInterval(interval));
    if (bucketMs === null) {
      const points = await this.telemetryPoints
        .find({
          sensorId,
          ...this.tsFilter(from, to),
        })
        .sort({ ts: -1 })
        .limit(cappedLimit)
        .toArray();
      return { sensor, points };
    }

    const points = await this.queryBucketedHistory(sensorId, from, to, bucketMs, cappedLimit);
    return { sensor, points };
  }

  private tsFilter(from?: string, to?: string): { ts?: { $gte?: string; $lte?: string } } {
    if (!from && !to) {
      return {};
    }

    return {
      ts: {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      },
    };
  }

  private async queryBucketedHistory(
    sensorId: string,
    from: string | undefined,
    to: string | undefined,
    bucketMs: number,
    limit: number,
  ): Promise<TelemetryHistoryPoint[]> {
    if (this.telemetryPoints === null) {
      return [];
    }

    const rows = await this.telemetryPoints
      .aggregate<HistoryBucketRow>([
        { $match: { sensorId, ...this.tsFilter(from, to) } },
        {
          $group: {
            _id: {
              $subtract: [
                { $toLong: { $toDate: '$ts' } },
                { $mod: [{ $toLong: { $toDate: '$ts' } }, bucketMs] },
              ],
            },
            value: { $avg: '$value' },
            unit: { $first: '$unit' },
            metric: { $first: '$metric' },
            sensorId: { $first: '$sensorId' },
            siteId: { $first: '$siteId' },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: limit },
      ])
      .toArray();

    return rows.map((row) => mapHistoryBucket(row));
  }

  listAlerts(filters: {
    status?: string;
    siteId?: string;
    sensorId?: string;
    severity?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) {
    const from = parseIsoDate(filters.from);
    const to = parseIsoDate(filters.to);

    return this.prisma.alert.findMany({
      where: {
        status: parseAlertStatus(filters.status),
        sensorId: filters.sensorId || undefined,
        severity: parseAlertSeverity(filters.severity),
        openedAt:
          from || to
            ? {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              }
            : undefined,
        sensor: filters.siteId ? { line: { siteId: filters.siteId } } : undefined,
      },
      orderBy: { openedAt: 'desc' },
      take: clampAlertListLimit(filters.limit),
      skip: clampAlertListOffset(filters.offset),
      include: { sensor: true },
    });
  }

  ackAlert(id: string) {
    return this.prisma.alert.update({
      where: { id },
      data: { status: 'acked' },
      include: { sensor: true },
    });
  }

  private toLatestSensor(row: unknown[]): LatestSensorRow {
    return {
      sensorId: String(row[0]),
      value: Number(row[1]),
      unit: String(row[2]),
      metric: String(row[3]),
      ts: Number(row[4]),
      siteId: String(row[5]),
      lineId: String(row[6]),
    };
  }
}
