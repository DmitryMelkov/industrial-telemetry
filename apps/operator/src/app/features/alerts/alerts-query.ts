import { AlertSeverity, AlertStatus, AlertsListQuery } from '../../shared/types/api.types';

export type AlertsStatusFilter = AlertStatus | 'all';
export type AlertsSeverityFilter = AlertSeverity | 'all';
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

export const resolveAlertsPeriod = (
  preset: AlertsPeriodFilter,
  now = Date.now(),
): AlertsPeriodBounds => {
  if (preset === 'all') {
    return {};
  }

  return {
    from: new Date(now - PERIOD_DURATION_MS[preset]).toISOString(),
    to: new Date(now).toISOString(),
  };
};

export const buildAlertsListQuery = (input: {
  siteId: string;
  status: AlertsStatusFilter;
  severity: AlertsSeverityFilter;
  period: AlertsPeriodFilter;
  now?: number;
}): AlertsListQuery => {
  const period = resolveAlertsPeriod(input.period, input.now);
  const query: AlertsListQuery = { siteId: input.siteId };

  if (input.status !== 'all') {
    query.status = input.status;
  }

  if (input.severity !== 'all') {
    query.severity = input.severity;
  }

  if (period.from !== undefined) {
    query.from = period.from;
  }

  if (period.to !== undefined) {
    query.to = period.to;
  }

  return query;
};

export const matchesAlertFilters = (
  alert: { status: AlertStatus; severity: AlertSeverity },
  status: AlertsStatusFilter,
  severity: AlertsSeverityFilter,
): boolean => {
  const matchesStatus = status === 'all' || alert.status === status;
  const matchesSeverity = severity === 'all' || alert.severity === severity;

  return matchesStatus && matchesSeverity;
};
