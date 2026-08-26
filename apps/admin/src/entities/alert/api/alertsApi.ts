import { http } from '@shared/api/http';
import type { Alert, AlertsListParams } from '../model/types';

function compactParams(params: AlertsListParams): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, String(value)]),
  );
}

export const alertsApi = {
  list: async (params: AlertsListParams = {}): Promise<Alert[]> => {
    const { data } = await http.get<Alert[]>('/alerts', { params: compactParams(params) });
    return data;
  },

  ack: async (id: string): Promise<Alert> => {
    const { data } = await http.patch<Alert>(`/alerts/${id}/ack`);
    return data;
  },
};
