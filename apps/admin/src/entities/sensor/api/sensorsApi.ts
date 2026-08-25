import { http } from '@shared/api/http';
import type {
  CreateSensorPayload,
  ReplaceThresholdsPayload,
  Sensor,
  SensorsListParams,
  UpdateSensorPayload,
} from '../model/types';

function compactParams(params: SensorsListParams): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}

export const sensorsApi = {
  list: async (params: SensorsListParams = {}): Promise<Sensor[]> => {
    const { data } = await http.get<Sensor[]>('/sensors', { params: compactParams(params) });
    return data;
  },

  get: async (id: string): Promise<Sensor> => {
    const { data } = await http.get<Sensor>(`/sensors/${id}`);
    return data;
  },

  create: async (payload: CreateSensorPayload): Promise<Sensor> => {
    const { data } = await http.post<Sensor>('/sensors', payload);
    return data;
  },

  update: async (id: string, payload: UpdateSensorPayload): Promise<Sensor> => {
    const { data } = await http.patch<Sensor>(`/sensors/${id}`, payload);
    return data;
  },

  replaceThresholds: async (id: string, payload: ReplaceThresholdsPayload): Promise<Sensor> => {
    const { data } = await http.put<Sensor>(`/sensors/${id}/thresholds`, payload);
    return data;
  },
};
