import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { findSiteById } from '@/lib/findSiteById';
import { useSitesQuery } from '@/queries/useSitesQuery';
import { useSiteStore } from '@/stores/site.store';

/** Выбранный site: id из Pinia, объект из кэша Vue Query. */
export function useSelectedSite() {
  const siteStore = useSiteStore();
  const { selectedSiteId } = storeToRefs(siteStore);
  const sitesQuery = useSitesQuery();

  const selectedSite = computed(() => {
    return findSiteById(sitesQuery.data.value, selectedSiteId.value);
  });

  return {
    selectedSiteId,
    selectedSite,
    sitesQuery,
    selectSite: siteStore.selectSite,
  };
}
