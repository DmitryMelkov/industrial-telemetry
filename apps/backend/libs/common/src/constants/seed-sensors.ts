import { SEED_IDS } from './seed-ids';
import type { MetricType } from '../types/telemetry-point';

/**
 * Демо-экскурсия: значение держится вне порога дольше alert debounce,
 * затем возвращается в норму. Не «вечный» alert.
 */
export interface SignalExcursion {
  /** Полный цикл, мс. */
  periodMs: number;
  /** Удержание вне порога, мс (должно быть > ALERT_OPEN_DEBOUNCE_SECONDS). */
  holdMs: number;
  /** Значение во время warning-экскурсии (выше warning max, ниже critical max). */
  warningValue: number;
  /** Значение во время critical-экскурсии (выше critical max). */
  criticalValue: number;
  /** Каждая N-я экскурсия — critical; 0 = только warning. */
  criticalEveryNCycles: number;
}

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
  /** Опциональный демо-профиль; без него — только base ± noise. */
  excursion?: SignalExcursion;
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

/** T-101: 45 с hold / 3 мин цикл — переживает debounce ~20 с, потом возврат в норму. */
const T101_EXCURSION: SignalExcursion = {
  periodMs: 180_000,
  holdMs: 45_000,
  warningValue: 94,
  criticalValue: 103,
  criticalEveryNCycles: 3,
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
    excursion: T101_EXCURSION,
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

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Значение точки для generator. `elapsedMs` — время с старта процесса,
 * чтобы первая экскурсия T-101 начиналась сразу после рестарта.
 */
export function sampleSensorValue(
  sensor: SeedSensorSpec,
  elapsedMs: number,
  random: () => number = Math.random,
): number {
  const excursion = sensor.excursion;

  if (excursion && elapsedMs >= 0) {
    const tInCycle = elapsedMs % excursion.periodMs;

    if (tInCycle < excursion.holdMs) {
      const cycleIndex = Math.floor(elapsedMs / excursion.periodMs);
      const useCritical =
        excursion.criticalEveryNCycles > 0 &&
        (cycleIndex + 1) % excursion.criticalEveryNCycles === 0;
      const target = useCritical ? excursion.criticalValue : excursion.warningValue;
      const wobble = (random() * 2 - 1) * 0.4;

      return round2(target + wobble);
    }
  }

  const noise = (random() * 2 - 1) * sensor.noise;

  return round2(sensor.baseValue + noise);
}
