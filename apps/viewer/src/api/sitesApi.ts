import { http } from './http';

export type SiteLine = {
  id: string;
  siteId: string;
  code: string;
  name: string;
};

export type Site = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  lines: SiteLine[];
};

/** Как в Operator / core-api */
export type SensorStatus = 'ok' | 'warning' | 'critical' | 'unknown';

export type OverviewSensor = {
  id: string;
  code: string;
  metric: string;
  unit: string;
  value: number | null;
  ts: string | null;
  status: SensorStatus;
};

export type SiteOverview = {
  siteId: string;
  sensors: OverviewSensor[];
  openAlerts: number;
};

export const sitesApi = {
  async list(): Promise<Site[]> {
    const { data } = await http.get<Site[]>('/sites');
    return data;
  },

  async getOverview(siteId: string): Promise<SiteOverview> {
    const { data } = await http.get<SiteOverview>(`/sites/${siteId}/overview`);
    return data;
  },
};
