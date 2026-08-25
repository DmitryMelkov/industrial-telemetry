import type { AlertSeverity, SensorMetric } from '@entities/sensor';

export const METRIC_OPTIONS: Array<{ value: SensorMetric; label: string; unit: string }> = [
  { value: 'temperature', label: 'Температура', unit: '°C' },
  { value: 'pressure', label: 'Давление', unit: 'bar' },
  { value: 'vibration', label: 'Вибрация', unit: 'mm/s' },
  { value: 'flow', label: 'Расход', unit: 'L/min' },
];

export const SEVERITY_OPTIONS: Array<{ value: AlertSeverity; label: string }> = [
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

export function metricLabel(metric: SensorMetric): string {
  return METRIC_OPTIONS.find((item) => item.value === metric)?.label ?? metric;
}

export function defaultUnit(metric: SensorMetric): string {
  return METRIC_OPTIONS.find((item) => item.value === metric)?.unit ?? '';
}
