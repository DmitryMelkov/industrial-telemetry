import { http } from '@shared/api/http';
import type { Site } from '../model/types';

export const sitesApi = {
  list: async (): Promise<Site[]> => {
    const { data } = await http.get<Site[]>('/sites');
    return data;
  },
};
