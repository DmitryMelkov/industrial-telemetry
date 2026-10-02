import { useQuery } from '@tanstack/vue-query';
import { sitesApi } from '@/api/sitesApi';

/** queryKey ≈ RTK Query endpoint name / React Query key */
export const siteKeys = {
  all: ['sites'] as const,
};

/**
 * useSitesQuery ≈ useQuery в React Admin.
 * queryFn вызывает axios (sitesApi.list) — симбиоз Query + axios.
 */
export function useSitesQuery() {
  return useQuery({
    queryKey: siteKeys.all,
    queryFn: sitesApi.list,
    staleTime: 30_000,
  });
}
