export interface User {
  id: string;
  email: string;
  role: 'operator' | 'admin';
}

export interface LoginResponse {
  user: User;
}

export type SensorStatus = 'ok' | 'warning' | 'critical' | 'unknown';

export interface OverviewSensor {
  id: string;
  code: string;
  metric: string;
  unit: string;
  value: number | null;
  ts: string | null;
  status: SensorStatus;
}

export interface SiteOverviewResponse {
  siteId: string;
  sensors: OverviewSensor[];
  openAlerts: number;
}

export interface RealtimeTelemetryPayload {
  sensorId: string;
  siteId: string;
  value: number;
  unit: string;
  metric: string;
  ts: string;
}

export interface RealtimeAlertPayload {
  id: string;
  sensorId: string;
  siteId: string;
  severity: 'warning' | 'critical';
  status: 'open' | 'acked' | 'resolved';
  message: string;
  value: number;
  openedAt: string;
}

export interface SensorHistoryPoint {
  sensorId: string;
  siteId: string;
  value: number;
  unit: string;
  metric: string;
  ts: string;
}

export interface SensorHistorySensor {
  id: string;
  code: string;
  name: string;
  metric: string;
  unit: string;
}

export interface SensorHistoryResponse {
  sensor: SensorHistorySensor;
  points: SensorHistoryPoint[];
}

export type ThresholdSeverity = 'warning' | 'critical';

export interface SensorThreshold {
  id: string;
  sensorId: string;
  minValue: number | string | null;
  maxValue: number | string | null;
  severity: ThresholdSeverity;
}

export interface SensorDetailResponse {
  id: string;
  code: string;
  name: string;
  metric: string;
  unit: string;
  isActive?: boolean;
  thresholds?: SensorThreshold[];
}

export interface SensorHistoryQuery {
  from?: string;
  to?: string;
  limit?: number;
}

export type AlertStatus = 'open' | 'acked' | 'resolved';
export type AlertSeverity = 'warning' | 'critical';

export interface AlertsListQuery {
  siteId: string;
  status?: AlertStatus;
  severity?: AlertSeverity;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface AlertSensor {
  id: string;
  code: string;
  name: string;
  metric: string;
  unit: string;
}

export interface AlertItem {
  id: string;
  sensorId: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  value: number;
  openedAt: string;
  resolvedAt: string | null;
  sensor?: AlertSensor;
  siteId?: string;
}

export interface SiteLine {
  id: string;
  siteId: string;
  code: string;
  name: string;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  createdAt?: string;
  lines: SiteLine[];
}
