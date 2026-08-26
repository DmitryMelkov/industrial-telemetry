export interface SiteLine {
  id: string;
  siteId: string;
  code: string;
  name: string;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  lines: SiteLine[];
}

export interface CreateSitePayload {
  code: string;
  name: string;
}

export interface UpdateSitePayload {
  code?: string;
  name?: string;
}

export interface CreateLinePayload {
  code: string;
  name: string;
}

export interface UpdateLinePayload {
  code?: string;
  name?: string;
}
