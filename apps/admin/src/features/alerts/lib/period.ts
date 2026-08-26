export type AlertsPeriodFilter = 'all' | '1h' | '6h' | '24h';

export interface AlertsPeriodBounds {
  from?: string;
  to?: string;
}

const PERIOD_DURATION_MS: Record<Exclude<AlertsPeriodFilter, 'all'>, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

export function resolveAlertsPeriod(
  preset: AlertsPeriodFilter,
  now = Date.now(),
): AlertsPeriodBounds {
  if (preset === 'all') {
    return {};
  }

  return {
    from: new Date(now - PERIOD_DURATION_MS[preset]).toISOString(),
    to: new Date(now).toISOString(),
  };
}
