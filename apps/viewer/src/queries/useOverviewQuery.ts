import { useQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { sitesApi } from '@/api/sitesApi';

export const overviewKeys = {
  all: ['overview'] as const,
  bySite: (siteId: string) => ['overview', siteId] as const,
};

/**
 * Второй запрос: overview зависит от selectedSiteId.
 * queryKey включает siteId → смена site = новый запрос (как в React Query).
 */
export function useOverviewQuery(siteId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => overviewKeys.bySite(toValue(siteId))),
    queryFn: function fetchOverview() {
      return sitesApi.getOverview(toValue(siteId));
    },
    enabled: computed(() => Boolean(toValue(siteId))),
    staleTime: 10_000,
  });
}
