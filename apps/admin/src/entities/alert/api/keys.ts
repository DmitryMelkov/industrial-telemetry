import type { AlertsListParams } from '../model/types';

export const alertKeys = {
  all: ['alerts'] as const,
  lists: () => [...alertKeys.all, 'list'] as const,
  list: (params: AlertsListParams) => [...alertKeys.lists(), params] as const,
};
