import { DEMO_SITE_ID } from '../config/demo-site';

export interface SiteIdCandidate {
  id: string;
}

/**
 * Pick active site: stored (if still listed) → demo seed → first site.
 * Returns null when the catalog is empty.
 */
export const resolveSelectedSiteId = (
  sites: SiteIdCandidate[],
  storedId: string | null,
  demoId = DEMO_SITE_ID,
): string | null => {
  if (sites.length === 0) {
    return null;
  }

  if (storedId !== null && storedId !== '' && sites.some((site) => site.id === storedId)) {
    return storedId;
  }

  if (sites.some((site) => site.id === demoId)) {
    return demoId;
  }

  return sites[0]?.id ?? null;
};
