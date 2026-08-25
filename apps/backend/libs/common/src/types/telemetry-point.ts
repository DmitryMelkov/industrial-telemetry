export type MetricType = 'temperature' | 'pressure' | 'vibration' | 'flow';

export interface TelemetryPoint {
  sensorId: string;
  siteId: string;
  lineId: string;
  metric: MetricType;
  value: number;
  unit: string;
  ts: string;
}
