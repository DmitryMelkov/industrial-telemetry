export type SensorMetric = 'temperature' | 'pressure' | 'vibration' | 'flow';
export type AlertSeverity = 'warning' | 'critical';

export interface SensorLine {
  id: string;
  siteId: string;
  code: string;
  name: string;
}

export interface SensorThreshold {
  id: string;
  sensorId: string;
  minValue: string | number | null;
  maxValue: string | number | null;
  severity: AlertSeverity;
}

export interface Sensor {
  id: string;
  lineId: string;
  code: string;
  name: string;
  metric: SensorMetric;
  unit: string;
  isActive: boolean;
  createdAt: string;
  line: SensorLine;
  thresholds: SensorThreshold[];
}

export interface SensorsListParams {
  siteId?: string;
  lineId?: string;
  metric?: SensorMetric;
}

export interface CreateSensorPayload {
  lineId: string;
  code: string;
  name: string;
  metric: SensorMetric;
  unit: string;
  isActive?: boolean;
}

export interface UpdateSensorPayload {
  code?: string;
  name?: string;
  unit?: string;
  isActive?: boolean;
}

export interface ThresholdInput {
  minValue?: number | null;
  maxValue?: number | null;
  severity: AlertSeverity;
}

export interface ReplaceThresholdsPayload {
  thresholds: ThresholdInput[];
}
