import { SEED_IDS } from './seed-ids';
import type { MetricType } from '../types/telemetry-point';

/** Спеки seed-датчиков для generator (совпадают с prisma/seed.ts). */
export interface SeedSensorSpec {
  sensorId: string;
  siteId: string;
  lineId: string;
  metric: MetricType;
  unit: string;
  /** Номинальное значение, вокруг которого добавляется шум. */
  baseValue: number;
  /** Полуамплитуда равномерного шума (±noise). */
  noise: number;
}

/** Профиль сигнала для датчиков, созданных в Admin (нет колонок baseValue/noise в БД). */
export const METRIC_SIGNAL_DEFAULTS: Record<
  MetricType,
  Pick<SeedSensorSpec, 'baseValue' | 'noise'>
> = {
  temperature: { baseValue: 75, noise: 8 },
  pressure: { baseValue: 3, noise: 1.2 },
  vibration: { baseValue: 2.2, noise: 1.5 },
  flow: { baseValue: 25, noise: 8 },
};

export const SEED_SENSORS: readonly SeedSensorSpec[] = [
  {
    sensorId: SEED_IDS.sensors.t101,
    siteId: SEED_IDS.site,
    lineId: SEED_IDS.lineA,
    metric: 'temperature',
    unit: '°C',
    baseValue: 75,
    noise: 8,
  },
  {
    sensorId: SEED_IDS.sensors.p201,
    siteId: SEED_IDS.site,
    lineId: SEED_IDS.lineA,
    metric: 'pressure',
    unit: 'bar',
    baseValue: 3,
    noise: 1.2,
  },
  {
    sensorId: SEED_IDS.sensors.v301,
    siteId: SEED_IDS.site,
    lineId: SEED_IDS.lineB,
    metric: 'vibration',
    unit: 'mm/s',
    baseValue: 2.2,
    noise: 1.5,
  },
  {
    sensorId: SEED_IDS.sensors.f401,
    siteId: SEED_IDS.site,
    lineId: SEED_IDS.lineB,
    metric: 'flow',
    unit: 'L/min',
    baseValue: 25,
    noise: 8,
  },
] as const;
