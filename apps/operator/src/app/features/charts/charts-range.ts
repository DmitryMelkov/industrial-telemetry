import { SensorThreshold } from '../../shared/types/api.types';

export type ChartRangePreset = '1h' | '6h' | '24h' | 'custom';

export const DEFAULT_CHART_RANGE = '1h' as const satisfies ChartRangePreset;
/** Покрывает ~1ч raw при 1 Гц; бэкенд режет history на 5000. */
export const HISTORY_LIMIT = 4000;
/** Custom-диапазон считается «до now», если `to` не старше этого запаса. */
export const LIVE_APPEND_SLACK_MS = 2 * 60 * 1000;

/**
 * Пороги шага истории — как `history-downsample` на бэкенде.
 * Operator не шлёт `interval`: core-api сам выбирает raw / 1m / 5m / 15m / 1h.
 */
export const RAW_HISTORY_MAX_MS = 2 * 60 * 60 * 1000;
const BUCKET_12H_MS = 12 * 60 * 60 * 1000;
const BUCKET_48H_MS = 48 * 60 * 60 * 1000;
const BUCKET_7D_MS = 7 * 24 * 60 * 60 * 1000;
const BUCKET_1M_MS = 60 * 1000;
const BUCKET_5M_MS = 5 * 60 * 1000;
const BUCKET_15M_MS = 15 * 60 * 1000;
const BUCKET_1H_MS = 60 * 60 * 1000;

export const PRESET_DURATION_MS: Record<Exclude<ChartRangePreset, 'custom'>, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

export interface HistoryWindow {
  from: string;
  to: string;
}

export interface ChartThreshold {
  severity: 'warning' | 'critical';
  minValue: number | null;
  maxValue: number | null;
}

export const resolvePresetWindow = (
  preset: Exclude<ChartRangePreset, 'custom'>,
  now = Date.now(),
): HistoryWindow => ({
  from: new Date(now - PRESET_DURATION_MS[preset]).toISOString(),
  to: new Date(now).toISOString(),
});

export const resolveHistoryBucketMs = (fromMs: number, toMs: number): number | null => {
  const duration = toMs - fromMs;
  if (!Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  if (duration <= RAW_HISTORY_MAX_MS) {
    return null;
  }
  if (duration <= BUCKET_12H_MS) {
    return BUCKET_1M_MS;
  }
  if (duration <= BUCKET_48H_MS) {
    return BUCKET_5M_MS;
  }
  if (duration <= BUCKET_7D_MS) {
    return BUCKET_15M_MS;
  }
  return BUCKET_1H_MS;
};

export const floorToBucket = (tsMs: number, bucketMs: number): number =>
  Math.floor(tsMs / bucketMs) * bucketMs;

export const resolveChartXRange = (
  fromMs: number | null,
  toMs: number | null,
  liveFollowNow: boolean,
  now = Date.now(),
): { min: number; max: number } | null => {
  if (fromMs === null || toMs === null || !Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    return null;
  }
  if (fromMs >= toMs) {
    return null;
  }
  if (liveFollowNow) {
    return { min: now - (toMs - fromMs), max: now };
  }
  return { min: fromMs, max: toMs };
};

export const formatChartWindowCaption = (
  fromIso: string,
  toIso: string,
  pointCount: number,
): string => {
  const format = (iso: string): string => {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) {
      return iso;
    }
    return new Date(ms).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return `${format(fromIso)} – ${format(toIso)} · ${pointCount} точек`;
};

/**
 * Live WS append:
 * - preset 1h/6h/24h — окно «до now», точки дописываем;
 * - custom — только если `to` близко к now (окно ещё «живое»).
 * Если custom `to` в прошлом — не append, чтобы история не «прыгала» вперёд.
 */
export const isLiveWindow = (
  preset: ChartRangePreset,
  toIso: string | null,
  now = Date.now(),
): boolean => {
  if (preset !== 'custom') {
    return true;
  }

  if (toIso === null || toIso === '') {
    return false;
  }

  const toMs = Date.parse(toIso);
  return Number.isFinite(toMs) && toMs >= now - LIVE_APPEND_SLACK_MS;
};

export const parseThresholdValue = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toChartThresholds = (raw: SensorThreshold[] | undefined): ChartThreshold[] => {
  if (raw === undefined || raw.length === 0) {
    return [];
  }

  return raw
    .map((item) => ({
      severity: item.severity,
      minValue: parseThresholdValue(item.minValue),
      maxValue: parseThresholdValue(item.maxValue),
    }))
    .filter((item) => item.minValue !== null || item.maxValue !== null);
};

export const toDateOrNull = (iso: string): Date | null => {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms) : null;
};

export const fromDateOrNull = (value: Date | null): string | null => {
  if (value === null || !Number.isFinite(value.getTime())) {
    return null;
  }

  return value.toISOString();
};

/** Календарь ставит дату в 00:00 — сохраняем уже выбранное время. */
export const applyCalendarDate = (nextDate: Date | null, current: Date | null): Date | null => {
  if (nextDate === null) {
    return null;
  }

  const result = new Date(nextDate.getTime());
  if (current !== null) {
    result.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), 0);
  }

  return result;
};

/** Timepicker меняет только часы/минуты. */
export const applyClockTime = (nextTime: Date | null, current: Date | null): Date | null => {
  if (nextTime === null) {
    return current;
  }

  const result = current !== null ? new Date(current.getTime()) : new Date();
  result.setHours(nextTime.getHours(), nextTime.getMinutes(), nextTime.getSeconds(), 0);
  return result;
};
