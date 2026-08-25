import type { SensorsListParams } from '../model/types';

export const sensorKeys = {
  all: ['sensors'] as const,
  lists: () => [...sensorKeys.all, 'list'] as const,
  list: (params: SensorsListParams) => [...sensorKeys.lists(), params] as const,
  details: () => [...sensorKeys.all, 'detail'] as const,
  detail: (id: string) => [...sensorKeys.details(), id] as const,
};
