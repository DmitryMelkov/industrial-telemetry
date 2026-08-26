import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  siteKeys,
  sitesApi,
  type CreateLinePayload,
  type CreateSitePayload,
  type UpdateLinePayload,
  type UpdateSitePayload,
} from '@entities/site';

export function useSitesQuery() {
  return useQuery({
    queryKey: siteKeys.all,
    queryFn: sitesApi.list,
  });
}

export function useCreateSiteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSitePayload) => sitesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: siteKeys.all });
    },
  });
}

export function useUpdateSiteMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSitePayload) => sitesApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: siteKeys.all });
    },
  });
}

export function useCreateLineMutation(siteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateLinePayload) => sitesApi.createLine(siteId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: siteKeys.all });
    },
  });
}

export function useUpdateLineMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLinePayload }) =>
      sitesApi.updateLine(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: siteKeys.all });
    },
  });
}
