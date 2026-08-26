import type { AlertSeverity, SensorMetric } from '@entities/sensor';

export type AlertStatus = 'open' | 'acked' | 'resolved';

export interface AlertSensor {
  id: string;
  lineId: string;
  code: string;
  name: string;
  metric: SensorMetric;
  unit: string;
  isActive: boolean;
  createdAt: string;
}

export interface Alert {
  id: string;
  sensorId: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  value: string | number;
  openedAt: string;
  resolvedAt: string | null;
  sensor: AlertSensor;
}

export interface AlertsListParams {
  siteId?: string;
  status?: AlertStatus;
  severity?: AlertSeverity;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}
