/** Query-time downsample for Mongo history. Same collection, no extra DB. */

export const HISTORY_RAW_MAX_MS = 2 * 60 * 60 * 1000;
export const HISTORY_BUCKET_12H_MS = 12 * 60 * 60 * 1000;
export const HISTORY_BUCKET_48H_MS = 48 * 60 * 60 * 1000;
export const HISTORY_BUCKET_7D_MS = 7 * 24 * 60 * 60 * 1000;

export const HISTORY_BUCKET_1M_MS = 60 * 1000;
export const HISTORY_BUCKET_5M_MS = 5 * 60 * 1000;
export const HISTORY_BUCKET_15M_MS = 15 * 60 * 1000;
export const HISTORY_BUCKET_1H_MS = 60 * 60 * 1000;

export type HistoryInterval = 'auto' | 'raw' | '1m' | '5m' | '15m' | '1h';

const INTERVAL_TO_BUCKET_MS: Record<Exclude<HistoryInterval, 'auto' | 'raw'>, number> = {
  '1m': HISTORY_BUCKET_1M_MS,
  '5m': HISTORY_BUCKET_5M_MS,
  '15m': HISTORY_BUCKET_15M_MS,
  '1h': HISTORY_BUCKET_1H_MS,
};

export const parseHistoryInterval = (value?: string): HistoryInterval => {
  if (value === 'raw' || value === '1m' || value === '5m' || value === '15m' || value === '1h') {
    return value;
  }

  return 'auto';
};

/**
 * `null` = raw points (find + limit).
 * Иначе шаг бакета в мс: ≤2ч raw; 2–12ч → 1м; 12–48ч → 5м; ≤7д → 15м; шире → 1ч.
 */
export const resolveHistoryBucketMs = (
  fromIso?: string,
  toIso?: string,
  interval: HistoryInterval = 'auto',
): number | null => {
  if (!fromIso || !toIso) {
    return null;
  }

  if (interval === 'raw') {
    return null;
  }

  if (interval !== 'auto') {
    return INTERVAL_TO_BUCKET_MS[interval];
  }

  const fromMs = Date.parse(fromIso);
  const toMs = Date.parse(toIso);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) {
    return null;
  }

  const duration = toMs - fromMs;
  if (duration <= HISTORY_RAW_MAX_MS) {
    return null;
  }
  if (duration <= HISTORY_BUCKET_12H_MS) {
    return HISTORY_BUCKET_1M_MS;
  }
  if (duration <= HISTORY_BUCKET_48H_MS) {
    return HISTORY_BUCKET_5M_MS;
  }
  if (duration <= HISTORY_BUCKET_7D_MS) {
    return HISTORY_BUCKET_15M_MS;
  }

  return HISTORY_BUCKET_1H_MS;
};

export interface HistoryBucketRow {
  _id: number;
  value: number;
  unit: string;
  metric: string;
  sensorId: string;
  siteId?: string;
}

export const mapHistoryBucket = (
  row: HistoryBucketRow,
): {
  sensorId: string;
  siteId?: string;
  value: number;
  unit: string;
  metric: string;
  ts: string;
} => ({
  sensorId: row.sensorId,
  siteId: row.siteId,
  value: row.value,
  unit: row.unit,
  metric: row.metric,
  ts: new Date(Number(row._id)).toISOString(),
});
