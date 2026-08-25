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
