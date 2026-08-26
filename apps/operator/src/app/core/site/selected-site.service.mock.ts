import { computed, signal } from '@angular/core';
import { DEMO_SITE_ID } from '../config/demo-site';
import { Site } from '../../shared/types/api.types';
import { SelectedSiteService } from './selected-site.service';

/** Test double with a resolved siteId (catalog already “loaded”). */
export const createSelectedSiteServiceMock = (
  siteId = DEMO_SITE_ID,
  site: Site | null = {
    id: siteId,
    code: 'PLANT-1',
    name: 'Demo Plant',
    lines: [],
  },
): {
  mock: Pick<SelectedSiteService, 'siteId' | 'selectedSite' | 'ensureLoaded'>;
  siteIdSignal: ReturnType<typeof signal<string>>;
} => {
  const siteIdSignal = signal(siteId);

  return {
    siteIdSignal,
    mock: {
      siteId: siteIdSignal.asReadonly(),
      selectedSite: computed(() => (siteIdSignal() === site?.id ? site : null)),
      ensureLoaded: () => undefined,
    },
  };
};
