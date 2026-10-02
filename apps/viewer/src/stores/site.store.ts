import { ref, watch } from 'vue';
import { defineStore } from 'pinia';

const STORAGE_KEY = 'it-viewer-site-id';

function readStoredSiteId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Client preference: какой site выбран. Список sites лежит в Vue Query. */
export const useSiteStore = defineStore('site', () => {
  const selectedSiteId = ref(readStoredSiteId());

  function selectSite(siteId: string) {
    selectedSiteId.value = siteId;
  }

  watch(
    selectedSiteId,
    (id) => {
      if (!id) return;
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {
        /* ignore */
      }
    },
    { immediate: true },
  );

  return {
    selectedSiteId,
    selectSite,
  };
});
