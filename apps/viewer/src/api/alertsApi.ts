import { http } from './http';

export type AlertStatus = 'open' | 'acked' | 'resolved';
export type AlertSeverity = 'warning' | 'critical';

export type AlertSensor = {
  id: string;
  code: string;
  name: string;
  metric: string;
  unit: string;
};

export type AlertItem = {
  id: string;
  sensorId: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  value: number | string;
  openedAt: string;
  resolvedAt: string | null;
  sensor?: AlertSensor;
};

export type AlertsListParams = {
  siteId?: string;
  status?: AlertStatus;
};

function compactParams(params: AlertsListParams): Record<string, string> {
  const entries = Object.entries(params).filter((entry) => {
    const value = entry[1];
    return value !== undefined && value !== '';
  });

  return Object.fromEntries(
    entries.map(([key, value]) => {
      return [key, String(value)];
    }),
  );
}

export const alertsApi = {
  async list(params: AlertsListParams = {}): Promise<AlertItem[]> {
    const { data } = await http.get<AlertItem[]>('/alerts', { params: compactParams(params) });
    return data;
  },

  async ack(id: string): Promise<AlertItem> {
    const { data } = await http.patch<AlertItem>(`/alerts/${id}/ack`);
    return data;
  },
};
