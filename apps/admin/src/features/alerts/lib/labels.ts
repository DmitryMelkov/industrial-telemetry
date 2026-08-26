import type { AlertStatus } from '@entities/alert';
import type { AlertSeverity } from '@entities/sensor';
import type { AlertsPeriodFilter } from './period';

export const STATUS_FILTERS: Array<{ value: '' | AlertStatus; label: string }> = [
  { value: '', label: 'Все статусы' },
  { value: 'open', label: 'Открыт' },
  { value: 'acked', label: 'Подтверждён' },
  { value: 'resolved', label: 'Закрыт' },
];

export const SEVERITY_FILTERS: Array<{ value: '' | AlertSeverity; label: string }> = [
  { value: '', label: 'Все уровни' },
  { value: 'warning', label: 'Предупреждение' },
  { value: 'critical', label: 'Критично' },
];

export const PERIOD_FILTERS: Array<{ value: AlertsPeriodFilter; label: string }> = [
  { value: 'all', label: 'Весь период' },
  { value: '1h', label: '1 ч' },
  { value: '6h', label: '6 ч' },
  { value: '24h', label: '24 ч' },
];

export function severityLabel(severity: AlertSeverity): string {
  return severity === 'critical' ? 'Критично' : 'Предупреждение';
}

export function statusLabel(status: AlertStatus): string {
  switch (status) {
    case 'open':
      return 'Открыт';
    case 'acked':
      return 'Подтверждён';
    case 'resolved':
      return 'Закрыт';
    default:
      return status;
  }
}

export function formatAlertValue(value: string | number): string {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? String(value) : String(numeric);
}

export function formatOpenedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}
