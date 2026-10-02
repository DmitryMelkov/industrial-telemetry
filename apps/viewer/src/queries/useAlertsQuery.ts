import { useQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { alertsApi, type AlertStatus } from '@/api/alertsApi';

export const alertKeys = {
  all: ['alerts'] as const,
  list: (siteId: string, status: AlertStatus | '') => ['alerts', siteId, status] as const,
};

/**
 * Третий запрос. queryKey = site + фильтр статуса:
 * смена site или фильтра → другой cache и новый GET.
 */
export function useAlertsQuery(
  siteId: MaybeRefOrGetter<string>,
  status: MaybeRefOrGetter<AlertStatus | ''>,
) {
  return useQuery({
    queryKey: computed(() => alertKeys.list(toValue(siteId), toValue(status))),
    queryFn: function fetchAlerts() {
      const statusFilter = toValue(status);

      return alertsApi.list({
        siteId: toValue(siteId),
        status: statusFilter || undefined,
      });
    },
    enabled: computed(() => Boolean(toValue(siteId))),
    staleTime: 10_000,
  });
}
