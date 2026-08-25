import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { alertKeys, alertsApi, type AlertsListParams } from '@entities/alert';

export function useAlertsQuery(params: AlertsListParams) {
  return useQuery({
    queryKey: alertKeys.list(params),
    queryFn: () => alertsApi.list(params),
  });
}

export function useAckAlertMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => alertsApi.ack(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: alertKeys.all });
    },
  });
}
