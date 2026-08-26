import { http } from '@shared/api/http';
import type {
  CreateLinePayload,
  CreateSitePayload,
  Site,
  SiteLine,
  UpdateLinePayload,
  UpdateSitePayload,
} from '../model/types';

export const sitesApi = {
  list: async (): Promise<Site[]> => {
    const { data } = await http.get<Site[]>('/sites');
    return data;
  },

  create: async (payload: CreateSitePayload): Promise<Site> => {
    const { data } = await http.post<Site>('/sites', payload);
    return data;
  },

  update: async (id: string, payload: UpdateSitePayload): Promise<Site> => {
    const { data } = await http.patch<Site>(`/sites/${id}`, payload);
    return data;
  },

  createLine: async (siteId: string, payload: CreateLinePayload): Promise<SiteLine> => {
    const { data } = await http.post<SiteLine>(`/sites/${siteId}/lines`, payload);
    return data;
  },

  updateLine: async (id: string, payload: UpdateLinePayload): Promise<SiteLine> => {
    const { data } = await http.patch<SiteLine>(`/lines/${id}`, payload);
    return data;
  },
};
