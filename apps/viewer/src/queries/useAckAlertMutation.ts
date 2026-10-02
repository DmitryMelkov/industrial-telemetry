import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { alertsApi } from '@/api/alertsApi';
import { alertKeys } from '@/queries/useAlertsQuery';
import { overviewKeys } from '@/queries/useOverviewQuery';

/** Подтверждение алерта. После успеха списки и overview перечитываются. */
export function useAckAlertMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function ackAlert(id: string) {
      return alertsApi.ack(id);
    },
    onSuccess: function refreshAlerts() {
      void queryClient.invalidateQueries({ queryKey: alertKeys.all });
      void queryClient.invalidateQueries({ queryKey: overviewKeys.all });
    },
  });
}
