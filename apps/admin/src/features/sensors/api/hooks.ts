import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  sensorKeys,
  sensorsApi,
  type ReplaceThresholdsPayload,
  type SensorsListParams,
  type UpdateSensorPayload,
} from '@entities/sensor';
import { siteKeys, sitesApi } from '@entities/site';

export function useSitesQuery() {
  return useQuery({
    queryKey: siteKeys.all,
    queryFn: sitesApi.list,
  });
}

export function useSensorsQuery(params: SensorsListParams) {
  return useQuery({
    queryKey: sensorKeys.list(params),
    queryFn: () => sensorsApi.list(params),
  });
}

export function useSensorQuery(id: string | undefined) {
  return useQuery({
    queryKey: sensorKeys.detail(id ?? ''),
    queryFn: () => {
      if (!id) {
        return Promise.reject(new Error('sensor id is required'));
      }
      return sensorsApi.get(id);
    },
    enabled: Boolean(id),
  });
}

export function useCreateSensorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sensorsApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sensorKeys.all });
    },
  });
}

export function useUpdateSensorMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSensorPayload) => sensorsApi.update(id, payload),
    onSuccess: (sensor) => {
      void queryClient.invalidateQueries({ queryKey: sensorKeys.all });
      queryClient.setQueryData(sensorKeys.detail(sensor.id), sensor);
    },
  });
}

export function useReplaceThresholdsMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReplaceThresholdsPayload) => sensorsApi.replaceThresholds(id, payload),
    onSuccess: (sensor) => {
      void queryClient.invalidateQueries({ queryKey: sensorKeys.all });
      queryClient.setQueryData(sensorKeys.detail(sensor.id), sensor);
    },
  });
}
