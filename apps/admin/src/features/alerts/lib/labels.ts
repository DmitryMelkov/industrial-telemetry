import type { AlertStatus } from '@entities/alert';
import type { AlertSeverity } from '@entities/sensor';

export const STATUS_FILTERS: Array<{ value: '' | AlertStatus; label: string }> = [
  { value: '', label: 'Все статусы' },
  { value: 'open', label: 'Open' },
  { value: 'acked', label: 'Acked' },
  { value: 'resolved', label: 'Resolved' },
];

export function severityLabel(severity: AlertSeverity): string {
  return severity === 'critical' ? 'Critical' : 'Warning';
}

export function statusLabel(status: AlertStatus): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'acked':
      return 'Acked';
    case 'resolved':
      return 'Resolved';
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
